const path = require("path");

/* ── Business identity ────────────────────────────────────────
   One source of truth for everything that carries the company's
   name outside the app: invoices, emails and reports. The values
   are overridable from .env so the same build can run for a
   different legal entity without touching code. */

const COMPANY = {
  name:      process.env.COMPANY_NAME    || "Cloud Graphics Amravati",
  legalName: process.env.COMPANY_LEGAL   || "Cloud Graphics",
  address1:  process.env.COMPANY_ADDR1   || "Block No. 70, Aakoli Road, Near Savji Dhaba, Sai Nagar",
  address2:  process.env.COMPANY_ADDR2   || "Amravati, Maharashtra, 444607",
  phone:     process.env.COMPANY_PHONE   || "9307641746",
  pan:       process.env.COMPANY_PAN     || "DNDPG2376C",
  email:     process.env.COMPANY_EMAIL   || "info@cloudgraphics.in",
  website:   process.env.COMPANY_WEBSITE || "www.cloudgraphics.in",
  gstin:     process.env.COMPANY_GSTIN   || "27ABCDE1234F1Z5",
  state:     process.env.COMPANY_STATE   || "Maharashtra",
  stateCode: process.env.COMPANY_STATE_CODE || "27",
};

/* Where customers pay — printed on the bill with a UPI QR. */
const BANK = {
  holder:  process.env.BANK_HOLDER  || "Kartikesh Ganoskar",
  ifsc:    process.env.BANK_IFSC    || "BARB0SAIAMR",
  account: process.env.BANK_ACCOUNT || "36430200000552",
  bank:    process.env.BANK_NAME    || "Bank of Baroda, BRANCH",
  upiId:   process.env.BANK_UPI_ID  || "9307641746-3@ybl",
};

/* ── Tax ──────────────────────────────────────────────────────
   A single 18% slab split evenly into CGST and SGST, which is the
   ordinary intra-state retail split. Catalogue prices are quoted
   GST-inclusive — what the customer is charged is what they pay —
   so the invoice works backwards from the paid amount to the
   taxable value rather than adding tax on top of it. */

const GST_RATE = Number(process.env.GST_RATE) || 18;   // total %
const CGST_RATE = GST_RATE / 2;
const SGST_RATE = GST_RATE / 2;

/** Round to 2dp without the float dust that `toFixed` alone leaves. */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Split a GST-inclusive amount into its taxable value and tax halves.
 * The two tax halves are derived from the same taxable base so they
 * always agree, and the taxable value absorbs any rounding remainder
 * so `taxable + cgst + sgst` equals the gross exactly.
 */
const splitGst = (grossAmount) => {
  const gross = round2(grossAmount);
  const taxable = round2(gross / (1 + GST_RATE / 100));
  const cgst = round2((taxable * CGST_RATE) / 100);
  const sgst = round2(gross - taxable - cgst); // absorbs the odd paisa
  return { gross, taxable, cgst, sgst, cgstRate: CGST_RATE, sgstRate: SGST_RATE, gstRate: GST_RATE };
};

/** Brand palette, sampled off the logo — shared by invoices and emails. */
const BRAND = {
  primary: "#0672a7",
  dark:    "#0a5b82",
  // Lighter than `dark` specifically for the masthead band behind the white
  // logo — the logo's own blues are close enough to `dark` that it loses
  // contrast against it, so the band itself needs to sit a shade lighter.
  band:    "#3b7c9b",
  deep:    "#0f435d",
  light:   "#eff8fd",
  border:  "#daeffa",
  ink:     "#1a2733",
  muted:   "#64748b",
  line:    "#e2e8f0",
};

const LOGO_DARK  = path.join(__dirname, "..", "assets", "logo.png");        // for light backgrounds
const LOGO_WHITE = path.join(__dirname, "..", "assets", "logo-white.png");  // for the brand band
const SIGNATURE  = path.join(__dirname, "..", "assets", "signature.png");   // founder signature on invoices

module.exports = {
  COMPANY,
  BANK,
  BRAND,
  GST_RATE,
  CGST_RATE,
  SGST_RATE,
  LOGO_DARK,
  LOGO_WHITE,
  SIGNATURE,
  round2,
  splitGst,
};
