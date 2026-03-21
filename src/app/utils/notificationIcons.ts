// SVG иконки для уведомлений в стиле Material Design

// Функция для кодирования SVG в base64
function encodeSvg(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export const icons = {
  // Доход - иконка стрелки вниз (получение средств)
  income: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" x2="12" y1="5" y2="19"/>
      <polyline points="19 12 12 19 5 12"/>
    </svg>
  `),
  
  // Расход - иконка стрелки вверх (трата средств)
  expense: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#F44336" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" x2="12" y1="19" y2="5"/>
      <polyline points="5 12 12 5 19 12"/>
    </svg>
  `),
  
  // Цель - иконка мишени
  goal: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#9C27B0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  `),
  
  // Успех - галочка в круге
  success: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  `),
  
  // Предупреждение - треугольник с восклицательным знаком
  warning: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#FF9800" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" x2="12" y1="9" y2="13"/>
      <line x1="12" x2="12.01" y1="17" y2="17"/>
    </svg>
  `),
  
  // Информация - буква i в круге
  info: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#2196F3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" x2="12" y1="16" y2="12"/>
      <line x1="12" x2="12.01" y1="8" y2="8"/>
    </svg>
  `),
  
  // Уведомление - колокольчик
  notification: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  `),
};

// Получить иконку для типа уведомления
export function getIconForType(type: 'income' | 'expense' | 'goal' | 'success' | 'warning' | 'info' | 'notification'): string {
  return icons[type] || icons.info;
}
