export const validation = {
  // amount
  amountRequired: 'Сумма обязательна',
  amountMustBeNumber: 'Сумма должна быть числом',
  amountMustBePositive: 'Сумма должна быть больше 0',
  amountExceedsMax: (max: number) => `Сумма превышает максимум (${max})`,
  amountTooSmall: (min: number) => `Сумма очень маленькая (< ${min})`,

  // type
  typeRequired: 'Тип операции обязателен',
  typeInvalidFull: (allowed: string) => `Неверный тип операции. Допустимые: ${allowed}`,
  typeInvalid: (allowed: string) => `Неверный тип. Допустимые: ${allowed}`,

  // categoryId (shared)
  categoryIdRequired: 'ID категории обязателен',
  categoryIdMustBeString: 'ID категории должен быть строкой',

  // date
  dateRequired: 'Дата обязательна',
  dateMustBeTimestamp: 'Дата должна быть временной меткой (число)',
  dateFuture: 'Дата в будущем',
  dateTooOld: 'Дата более 10 лет назад',

  // currency
  currencyMustBeString: 'Валюта должна быть строкой',
  currencyMustBe3Chars: 'Валюта должна быть 3-буквенным кодом (например, RUB, USD)',

  // misc shared
  rateMustBePositive: 'Курс обмена должен быть положительным числом',
  commentTooLong: (max: number) => `Комментарий превышает максимальную длину (${max} символов)`,
  nameTooLong: (max: number) => `Название превышает максимальную длину (${max} символов)`,
  iconMustBeString: 'Иконка должна быть строкой',
  colorMustBeString: 'Цвет должен быть строкой',
  isActiveMustBeBool: 'isActive должен быть булевым значением',

  // category
  categoryNameRequired: 'Название категории обязательно',
  categoryNameBlank: 'Название не может быть пустым или состоять только из пробелов',
  categoryTypeRequired: 'Тип категории обязателен',
  categoryIconTooLong: 'Иконка слишком длинная (ожидается эмодзи или короткое название)',
  categoryColorInvalidFormat: 'Цвет должен быть в формате hex (например, #FF5722)',
  categoryIsSystemMustBeBool: 'isSystem должен быть булевым значением',
  categoryParentIdMustBeString: 'ID родительской категории должен быть строкой',

  // budget
  budgetPeriodRequired: 'Период обязателен',
  budgetPeriodInvalid: (allowed: string) => `Неверный период. Допустимые: ${allowed}`,
  budgetStartDateRequired: 'Дата начала обязательна',
  budgetStartDateMustBeTimestamp: 'Дата начала должна быть временной меткой (число)',

  // goal
  goalNameRequired: 'Название цели обязательно',
  goalTargetAmountRequired: 'Целевая сумма обязательна',
  goalTargetAmountMustBeNumber: 'Целевая сумма должна быть числом',
  goalTargetAmountMustBePositive: 'Целевая сумма должна быть больше 0',
  goalCurrentAmountMustBeNumber: 'Текущая сумма должна быть числом',
  goalCurrentAmountNegative: 'Текущая сумма не может быть отрицательной',
  goalCurrentExceedsTarget: 'Текущая сумма превышает целевую',
  goalDeadlineMustBeTimestamp: 'Дедлайн должен быть временной меткой (число)',
  goalDeadlineInPast: 'Срок накопления в прошлом',

  // recurring template
  recurringIntervalRequired: 'Интервал обязателен',
  recurringIntervalInvalid: (allowed: string) => `Неверный интервал. Допустимые: ${allowed}`,
  recurringNextDateRequired: 'Следующая дата обязательна',
  recurringNextDateMustBeTimestamp: 'Следующая дата должна быть временной меткой (число)',

  // ai pattern
  aiPatternRequired: 'Шаблон обязателен',
  aiPatternMustBeString: 'Шаблон должен быть строкой',
  aiPatternTooShort: (min: number) => `Шаблон должен быть не менее ${min} символов`,
  aiPatternTooLong: 'Шаблон слишком длинный',
  aiConfidenceMustBeNumber: 'Уверенность должна быть числом',
  aiConfidenceRange: (min: number, max: number) => `Уверенность должна быть от ${min} до ${max}`,
  aiUsageCountMustBeNumber: 'Счётчик использований должен быть числом',
  aiUsageCountNegative: 'Счётчик использований не может быть отрицательным',
  aiUsageCountExceedsMax: (max: number) => `Счётчик использований превышает максимум (${max})`,
};
