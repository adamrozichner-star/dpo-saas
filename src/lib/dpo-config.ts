// DPO Configuration - Update with actual DPO details before launch

export const DPO_CONFIG = {
  name: 'שם הממונה', // Replace with actual DPO name
  licenseNumber: 'XXXXXX', // Replace with actual license number
  email: 'dpo@dpo-pro.co.il',
  phone: '03-XXX-XXXX',
  
  company: {
    name: 'DPO-Pro בע"מ',
    businessId: 'XXXXXXXXX',
    address: 'תל אביב, ישראל',
    email: 'support@dpo-pro.co.il',
  },
  
  serviceLimits: {
    basic: {
      dpoTimePerQuarter: 30,
      escalationsPerQuarter: 2,
    },
    extended: {
      dpoTimePerQuarter: 120,
      escalationsPerQuarter: 8,
    }
  }
}
