/* eslint-disable */
// Воспроизведение инференса для диагностики "всё уходит в Еду"
const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs');

// IO handler для loadLayersModel в Node без @tensorflow/tfjs-node
function fileIOHandler(modelJsonPath) {
  const dir = path.dirname(modelJsonPath);
  return {
    load: async () => {
      const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, 'utf8'));
      // ─── ПАТЧ совместимости Keras 3 → TF.js Layers 4.x ──────────────────────
      // Keras 3 поменял три вещи, которые tfjs-layers 4.22 не знает:
      //   1) InputLayer.config.batch_shape  → batch_input_shape
      //   2) inbound_nodes [{args, kwargs}] → [[[layer, n_idx, t_idx, kwargs]]]
      //   3) input_layers [name,0,0]        → [[name,0,0]]
      //      output_layers {name:[...]}     → [[name,0,0], ...]
      const topo = modelJson.modelTopology?.model_config?.config;
      if (topo?.layers) {
        for (const layer of topo.layers) {
          const cfg = layer.config;
          if (cfg && cfg.batch_shape && cfg.batch_input_shape == null) {
            cfg.batch_input_shape = cfg.batch_shape;
            delete cfg.batch_shape;
          }
          if (Array.isArray(layer.inbound_nodes) && layer.inbound_nodes.length > 0
              && !Array.isArray(layer.inbound_nodes[0])) {
            layer.inbound_nodes = layer.inbound_nodes.map(call => {
              const inputs = (call.args || []).map(arg => {
                const hist = arg?.config?.keras_history;
                if (!hist) return null;
                return [hist[0], hist[1] ?? 0, hist[2] ?? 0, call.kwargs || {}];
              }).filter(Boolean);
              return inputs;
            });
          }
        }
      }
      if (topo?.input_layers && !Array.isArray(topo.input_layers[0])) {
        topo.input_layers = [topo.input_layers];
      }
      if (topo?.output_layers && !Array.isArray(topo.output_layers)) {
        topo.output_layers = Object.values(topo.output_layers);
      }
      // 4) Keras 3: L1 / L2 — отдельные классы; TF.js знает только L1L2
      const fixReg = v => {
        if (!v || typeof v !== 'object') return v;
        if (v.class_name === 'L2') {
          return { class_name: 'L1L2', config: { l1: 0, l2: v.config?.l2 ?? 0 } };
        }
        if (v.class_name === 'L1') {
          return { class_name: 'L1L2', config: { l1: v.config?.l1 ?? 0, l2: 0 } };
        }
        return v;
      };
      if (topo?.layers) {
        for (const layer of topo.layers) {
          const cfg = layer.config;
          if (!cfg) continue;
          for (const k of ['kernel_regularizer', 'bias_regularizer', 'activity_regularizer']) {
            if (cfg[k]) cfg[k] = fixReg(cfg[k]);
          }
        }
      }
      const manifest = modelJson.weightsManifest;
      const weightSpecs = [];
      const buffers = [];
      for (const group of manifest) {
        for (const spec of group.weights) weightSpecs.push(spec);
        for (const p of group.paths) buffers.push(fs.readFileSync(path.join(dir, p)));
      }
      const totalLen = buffers.reduce((s, b) => s + b.length, 0);
      const merged = new Uint8Array(totalLen);
      let off = 0;
      for (const b of buffers) { merged.set(b, off); off += b.length; }
      return {
        modelTopology: modelJson.modelTopology,
        weightSpecs,
        weightData: merged.buffer,
        format: modelJson.format,
        generatedBy: modelJson.generatedBy,
        convertedBy: modelJson.convertedBy,
      };
    },
  };
}

(async () => {
  const root = path.resolve(__dirname, '..');
  const params = JSON.parse(fs.readFileSync(path.join(root, 'public/model/tfidf_params.json'), 'utf8'));
  const classMap = JSON.parse(fs.readFileSync(path.join(root, 'public/model/class_mapping.json'), 'utf8'));
  const model = await tf.loadLayersModel(fileIOHandler(path.join(root, 'public/model/model.json')));

  function charNgrams(text, n) {
    const grams = [];
    for (const word of text.split(/\s+/)) {
      if (!word) continue;
      const padded = ' ' + word + ' ';
      for (let i = 0; i <= padded.length - n; i++) grams.push(padded.slice(i, i + n));
    }
    return grams;
  }

  function tfidf(text) {
    const { vocab, idf, ngram_range, max_features, sublinear_tf } = params;
    const [minN, maxN] = ngram_range;
    const counts = {};
    for (let n = minN; n <= maxN; n++) {
      for (const g of charNgrams(text.toLowerCase(), n)) {
        if (Object.prototype.hasOwnProperty.call(vocab, g)) counts[g] = (counts[g] || 0) + 1;
      }
    }
    const vec = new Float32Array(max_features);
    for (const [g, c] of Object.entries(counts)) {
      const i = vocab[g];
      const tfv = sublinear_tf ? 1 + Math.log(c) : c;
      vec[i] = tfv * idf[i];
    }
    let n = 0;
    for (const v of vec) n += v * v;
    n = Math.sqrt(n) || 1;
    return vec.map(v => v / n);
  }

  // Дополнительно: распределение argmax при подаче нулевого вектора
  const zero = tf.zeros([1, params.max_features]);
  const zOut = model.predict(zero);
  const zArr = Array.isArray(zOut) ? zOut : [zOut];
  const zCat = Array.from(zArr[0].dataSync());
  const zIdx = zCat.indexOf(Math.max(...zCat));
  console.log('=== ZERO VECTOR baseline (bias dominance) ===');
  console.log('argmax on zeros:', classMap[zIdx], '=', (zCat[zIdx] * 100).toFixed(1) + '%');
  console.log('full distribution:', zCat.map((p, i) => classMap[i] + ':' + (p * 100).toFixed(0) + '%').join(' | '));
  console.log();

  const tests = [
    'кофе', 'такси', 'бензин', 'аптека', 'продукты в магазине',
    'зарплата', 'подарок другу', 'ужин в ресторане', 'футболка',
    'купил книгу', 'оплатил коммуналку', 'инвестиции в акции',
    'аренда квартиры', 'кино', 'врач', 'метро',
  ];
  console.log('=== INFERENCE PER TEXT ===');
  for (const t of tests) {
    const v = tfidf(t);
    const nz = Array.from(v).filter(x => x !== 0).length;
    const input = tf.tensor2d([Array.from(v)]);
    const out = model.predict(input);
    const arr = Array.isArray(out) ? out : [out];
    const cat = Array.from(arr[0].dataSync());
    const typ = arr[1] ? arr[1].dataSync()[0] : null;
    const idx = cat.indexOf(Math.max(...cat));
    const top3 = cat
      .map((p, i) => ({ n: classMap[i], p }))
      .sort((a, b) => b.p - a.p)
      .slice(0, 3)
      .map(x => x.n + ' ' + (x.p * 100).toFixed(0) + '%')
      .join(', ');
    console.log(
      '"' + t + '" nz=' + nz + ' → ' + classMap[idx] +
      '  type=' + (typ !== null ? (typ > 0.5 ? 'inc' : 'exp') + '(' + (typ * 100).toFixed(0) + '%)' : 'n/a') +
      '  top3: ' + top3
    );
    input.dispose();
    arr.forEach(x => x.dispose());
  }
})().catch(e => console.error('ERR:', e.message, e.stack));
