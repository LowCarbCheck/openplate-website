/**
 * The legal identity of the site operator, as required on the imprint page.
 *
 * Data, not prose: the strings below are copied byte-for-byte from the
 * commercial register and must not be "corrected" or reworded. Labels for
 * these fields (e.g. "Represented by") are translated prose and live in the
 * locale files under `pages.imprint` instead.
 */
export const OPERATOR = {
  legalName: 'SPARQ VENTURES UG (haftungsbeschränkt)',
  street: 'Straße 73 49',
  postalCode: '13125',
  city: 'Berlin',
  country: 'Deutschland',
  managingDirector: 'Altan Sarisin',
  registerNumber: 'HRB 174062 B',
  registerCourt: 'Amtsgericht Charlottenburg',
  vatId: 'DE312546809',
  imprintEmail: 'info@sprqvntrs.com',
} as const;
