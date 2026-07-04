// Mexican national numbers are uniformly 10 digits; 15 is the E.164 maximum.
const minPhoneDigits = 10;
const maxPhoneDigits = 15;

export function isValidPhoneNumber(value: string) {
  const digitCount = value.replace(/\D/g, '').length;

  return digitCount >= minPhoneDigits && digitCount <= maxPhoneDigits;
}
