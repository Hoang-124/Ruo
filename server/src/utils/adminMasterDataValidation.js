const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s().-]{5,18}[0-9]$/;

const fieldTypes = {
  code: {
    label: 'Mã',
    normalize: value => String(value).trim().toUpperCase(),
    valid: value => CODE_PATTERN.test(value),
    invalidMessage: 'chỉ được gồm 2–32 ký tự chữ, số, gạch ngang hoặc gạch dưới.'
  },
  text: {
    normalize: value => String(value).trim(),
    valid: () => true
  },
  email: {
    normalize: value => String(value).trim().toLowerCase(),
    valid: value => value === '' || EMAIL_PATTERN.test(value),
    invalidMessage: 'không đúng định dạng email.'
  },
  phone: {
    normalize: value => String(value).trim(),
    valid: value => value === '' || (PHONE_PATTERN.test(value) && value.replace(/\D/g, '').length >= 7),
    invalidMessage: 'không đúng định dạng số điện thoại.'
  }
};

export const validateAdminMasterData = (input, schema, { requireAtLeastOne = false } = {}) => {
  const errors = [];
  const output = {};

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { value: output, errors: [{ field: 'body', message: 'Dữ liệu gửi lên phải là một object JSON.' }] };
  }

  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(schema, key)) {
      errors.push({ field: key, message: 'Trường này không được hỗ trợ.' });
    }
  }

  for (const [field, rules] of Object.entries(schema)) {
    const supplied = Object.hasOwn(input, field);
    if (!supplied && rules.required) {
      errors.push({ field, message: `${rules.label || field} là bắt buộc.` });
      continue;
    }
    if (!supplied) {
      if (Object.hasOwn(rules, 'default')) output[field] = rules.default;
      continue;
    }

    const rawValue = input[field];
    if (rules.type === 'number') {
      const numericValue = typeof rawValue === 'number'
        ? rawValue
        : (typeof rawValue === 'string' && rawValue.trim() !== '' ? Number(rawValue) : Number.NaN);
      if (!Number.isFinite(numericValue)) {
        errors.push({ field, message: `${rules.label || field} phải là một số hợp lệ.` });
        continue;
      }
      if (rules.integer && !Number.isInteger(numericValue)) {
        errors.push({ field, message: `${rules.label || field} phải là số nguyên.` });
        continue;
      }
      if (numericValue < rules.min || numericValue > rules.max) {
        errors.push({ field, message: `${rules.label || field} phải nằm trong khoảng ${rules.min}–${rules.max}.` });
        continue;
      }
      output[field] = numericValue;
      continue;
    }

    if (rules.type === 'boolean') {
      if (typeof rawValue !== 'boolean') {
        errors.push({ field, message: `${rules.label || field} phải là true hoặc false.` });
        continue;
      }
      output[field] = rawValue;
      continue;
    }

    if (typeof rawValue !== 'string') {
      errors.push({ field, message: `${rules.label || field} phải là chuỗi ký tự.` });
      continue;
    }

    const type = fieldTypes[rules.type || 'text'];
    const value = type.normalize(rawValue);
    if (rules.required && !value) {
      errors.push({ field, message: `${rules.label || field} không được để trống.` });
      continue;
    }
    if (value.length > rules.maxLength) {
      errors.push({ field, message: `${rules.label || field} không được vượt quá ${rules.maxLength} ký tự.` });
      continue;
    }
    if (rules.minLength && value.length < rules.minLength) {
      errors.push({ field, message: `${rules.label || field} phải có ít nhất ${rules.minLength} ký tự.` });
      continue;
    }
    if (!type.valid(value)) {
      errors.push({ field, message: `${rules.label || field} ${type.invalidMessage}` });
      continue;
    }
    output[field] = value;
  }

  if (requireAtLeastOne && Object.keys(output).length === 0 && errors.length === 0) {
    errors.push({ field: 'body', message: 'Cần cung cấp ít nhất một trường để cập nhật.' });
  }

  return { value: output, errors };
};

export const sendAdminValidationError = (res, errors) =>
  res.status(400).json({
    success: false,
    message: errors[0]?.message || 'Dữ liệu không hợp lệ.',
    errors
  });

export const isValidDocumentId = value => /^[a-f\d]{24}$/i.test(String(value || ''));
