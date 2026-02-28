// DPO Configuration - Update with actual DPO details before launch

export const DPO_CONFIG = {
  name: 'עו"ד דנה כהן', // Replace with actual DPO name
  licenseNumber: 'DPO-2025-001', // Replace with actual license number
  email: 'dpo@mydpo.co.il',
  phone: '03-555-1234',
  
  company: {
    name: 'MyDPO בע"מ',
    businessId: 'XXXXXXXXX',
    address: 'תל אביב, ישראל',
    email: 'support@mydpo.co.il',
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

// Export for document generator
export const dpoConfig = {
  name: DPO_CONFIG.name,
  email: DPO_CONFIG.email,
  phone: DPO_CONFIG.phone,
  licenseNumber: DPO_CONFIG.licenseNumber
}
