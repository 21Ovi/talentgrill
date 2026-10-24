/**
 * Accepts a 10-digit Indian mobile number starting 6-9, with an optional
 * +91 / 91 / 0 prefix and any separators. Returns +91XXXXXXXXXX or null.
 */
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let local = digits;
  if (digits.length === 12 && digits.startsWith("91")) local = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) local = digits.slice(1);
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}
