/**
 * Data Store & State Management con soporte de almacenamiento real, importación de respaldo y datos semilla oficiales
 */

const STORAGE_KEY = 'tax_portal_app_state_v2';

export const TAX_STAGES = [
  { id: 1, name: 'Recopilación de Documentos', desc: 'Envío y verificación de certificados e ingresos' },
  { id: 2, name: 'Análisis & Borrador', desc: 'Elaboración del borrador de declaración (Formulario 210)' },
  { id: 3, name: 'Presentada ante la DIAN', desc: 'Declaración firmada e ingresada a la entidad tributaria' },
  { id: 4, name: 'Finalizada & Pagada', desc: 'Trámite concluido con soporte de pago / Paz y Salvo' }
];

export const DEFAULT_CHECKLIST = [
  { id: 'chk_cert220', title: 'Certificado de Ingresos y Retenciones 220 (Laboral)', category: 'Ingresos', required: true },
  { id: 'chk_bancos', title: 'Certificados Financieros / Extractos bancarios a 31 de Diciembre', category: 'Patrimonio', required: true },
  { id: 'chk_predial', title: 'Impuesto Predial o Avalúo Catastral de Bienes Inmuebles', category: 'Patrimonio', required: false },
  { id: 'chk_vehiculos', title: 'Impuesto de Vehículos y Licencia de Tránsito', category: 'Patrimonio', required: false },
  { id: 'chk_prepagada', title: 'Certificado de Medicina Prepagada o Salud Complementaria', category: 'Deducciones', required: false },
  { id: 'chk_dependientes', title: 'Certificación / Soporte de Dependientes Económicos', category: 'Deducciones', required: false },
  { id: 'chk_afc', title: 'Certificado de Aportes Voluntarios a Pensión o Cuentas AFC', category: 'Rentas Exentas', required: false }
];

const INITIAL_SEED_DATA = {
  users: [
    {
      id: 'usr_admin',
      email: 'admin@taxportal.com',
      password: 'admin123',
      name: 'Carlos Mendoza, CPA',
      role: 'admin',
      isCentralAdmin: true,
      phone: '+57 300 123 4567',
      specialty: 'Contador Público - Registro TP 184592-T'
    },
    {
      id: 'usr_client_1784749289957',
      email: 'andrescanov.04@gmail.com',
      password: '1234',
      name: 'ANDRES CANO VELEZ',
      role: 'client',
      status: 'active',
      assignedAdminId: 'usr_admin',
      nit: '1035970485',
      phone: '3193088492',
      year: '2025',
      currentStage: 1,
      financials: {
        totalIncome: '$ 0',
        taxCalculated: '$ 0',
        withholdings: '$ 0',
        netBalance: '$ 0',
        balanceType: 'neutral',
        dueDate: 'Pendiente'
      },
      notes: 'Cliente registrado en el sistema. Pendiente de soportes.',
      checklist: JSON.parse(JSON.stringify(DEFAULT_CHECKLIST)),
      documents: [],
      messages: [],
      history: [
        {
          id: 'log_init',
          date: '22/7/2026 02:41 p. m.',
          action: 'Cliente registrado exitosamente en el portal.'
        }
      ]
    }
  ],
  currentUser: null
};

// Store Operations
export function getStore() {
  const dataStr = localStorage.getItem(STORAGE_KEY);
  let store;
  if (!dataStr) {
    saveStore(INITIAL_SEED_DATA);
    store = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  } else {
    try {
      store = JSON.parse(dataStr);
      // Ensure seed admin and existing client ANDRES CANO VELEZ are present if database was empty
      if (!store.users || store.users.length === 0) {
        store.users = JSON.parse(JSON.stringify(INITIAL_SEED_DATA.users));
        saveStore(store);
      } else {
        // Ensure primary seed admin has isCentralAdmin
        const adminUser = store.users.find(u => u.id === 'usr_admin' || u.email === 'admin@taxportal.com');
        if (adminUser) {
          adminUser.isCentralAdmin = true;
        }

        // Merge ANDRES CANO VELEZ if not present
        const hasAndres = store.users.find(u => u.email === 'andrescanov.04@gmail.com');
        if (!hasAndres) {
          store.users.push(INITIAL_SEED_DATA.users[1]);
        }

        // Ensure all clients have an assignedAdminId (default to usr_admin)
        let modified = false;
        store.users.forEach(u => {
          if (u.role === 'client' && !u.assignedAdminId) {
            u.assignedAdminId = 'usr_admin';
            modified = true;
          }
        });
        if (modified || !hasAndres) {
          saveStore(store);
        }
      }
    } catch (e) {
      console.error('Failed to parse state, resetting to initial seed.', e);
      saveStore(INITIAL_SEED_DATA);
      store = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
    }
  }
  return store;
}

export function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('LocalStorage Quota Exceeded. Optimizing storage...', e);
    try {
      const lightweightStore = JSON.parse(JSON.stringify(store));
      lightweightStore.users.forEach(u => {
        if (u.documents && u.documents.length > 3) {
          u.documents.slice(0, u.documents.length - 3).forEach(d => {
            if (d.fileData && d.fileData.length > 50000) {
              d.fileData = null;
            }
          });
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweightStore));
    } catch (err) {
      console.error('Critical storage failure:', err);
    }
  }
}

export function resetToProductionMode() {
  saveStore(INITIAL_SEED_DATA);
}

export function importBackupStore(importedStore) {
  if (importedStore && Array.isArray(importedStore.users)) {
    saveStore(importedStore);
    return true;
  }
  return false;
}

export function findUserByEmail(email) {
  const store = getStore();
  if (!email) return null;
  return store.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase().trim());
}

export function updateUserProfile(userId, updatedData) {
  const store = getStore();
  const userIndex = store.users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    store.users[userIndex] = { ...store.users[userIndex], ...updatedData };
    if (store.currentUser && store.currentUser.id === userId) {
      store.currentUser = { ...store.currentUser, ...updatedData };
    }
    saveStore(store);
    return store.users[userIndex];
  }
  return null;
}

export function createNewAdmin(adminData) {
  const store = getStore();
  const newId = 'usr_admin_' + Date.now();
  const newAdmin = {
    id: newId,
    email: (adminData.email || '').trim().toLowerCase(),
    password: adminData.password || 'admin123',
    name: (adminData.name || 'Contador').trim(),
    role: 'admin',
    phone: adminData.phone || '',
    specialty: adminData.specialty || 'Contador Público',
    status: 'active'
  };

  store.users.push(newAdmin);
  saveStore(store);
  return newAdmin;
}

export function updateUserStatus(userId, newStatus) {
  const store = getStore();
  const user = store.users.find(u => u.id === userId);
  if (user) {
    user.status = newStatus;
    saveStore(store);
  }
}

export function deleteUser(userId) {
  const store = getStore();
  store.users = store.users.filter(u => u.id !== userId);
  saveStore(store);
}

export function updateClientStage(clientId, newStageId) {
  const store = getStore();
  const client = store.users.find(u => u.id === clientId);
  if (client) {
    client.currentStage = parseInt(newStageId);
    addClientLog(client, `Etapa actualizada a: ${TAX_STAGES.find(s => s.id === parseInt(newStageId))?.name}`);
    saveStore(store);
  }
}

export function addDocumentToClient(clientId, docObj) {
  const store = getStore();
  const client = store.users.find(u => u.id === clientId);
  if (client) {
    if (!client.documents) client.documents = [];
    const newDoc = {
      id: 'doc_' + Date.now(),
      status: 'pending',
      uploadedAt: new Date().toISOString(),
      ...docObj
    };
    client.documents.push(newDoc);
    addClientLog(client, `Documento subido: ${docObj.name}`);
    saveStore(store);
    return newDoc;
  }
  return null;
}

export function updateDocumentStatus(clientId, docId, status, feedback = '') {
  const store = getStore();
  const client = store.users.find(u => u.id === clientId);
  if (client && client.documents) {
    const doc = client.documents.find(d => d.id === docId);
    if (doc) {
      doc.status = status;
      if (feedback) doc.feedback = feedback;
      addClientLog(client, `Estado del documento '${doc.name}' actualizado a: ${status}`);
      saveStore(store);
    }
  }
}

export function addMessageToClient(clientId, msgObj) {
  const store = getStore();
  const client = store.users.find(u => u.id === clientId);
  if (client) {
    if (!client.messages) client.messages = [];
    const newMsg = {
      id: 'msg_' + Date.now(),
      timestamp: new Date().toISOString(),
      ...msgObj
    };
    client.messages.push(newMsg);
    saveStore(store);
    return newMsg;
  }
  return null;
}

export function updateClientFinancials(clientId, financialsData) {
  const store = getStore();
  const client = store.users.find(u => u.id === clientId);
  if (client) {
    client.financials = { ...client.financials, ...financialsData };
    addClientLog(client, 'Cifras tributarias actualizadas por el contador.');
    saveStore(store);
    return client.financials;
  }
  return null;
}

export function addClientLog(client, actionText) {
  if (!client.history) client.history = [];
  client.history.push({
    id: 'log_' + Date.now(),
    date: new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    action: actionText
  });
}

export function createNewClient(clientData) {
  const store = getStore();
  const newId = 'usr_client_' + Date.now();
  const defaultAdmin = store.users.find(u => u.role === 'admin' && u.isCentralAdmin) || store.users.find(u => u.role === 'admin') || { id: 'usr_admin' };
  const newClient = {
    id: newId,
    email: (clientData.email || '').trim().toLowerCase(),
    password: clientData.password || 'client123',
    name: (clientData.name || 'Nuevo Contribuyente').trim(),
    role: 'client',
    status: 'active',
    assignedAdminId: clientData.assignedAdminId || defaultAdmin.id,
    nit: (clientData.nit || 'Sin Registrar').trim(),
    phone: (clientData.phone || '').trim(),
    year: clientData.year || '2025',
    currentStage: 1,
    financials: {
      totalIncome: '$ 0',
      taxCalculated: '$ 0',
      withholdings: '$ 0',
      netBalance: '$ 0',
      balanceType: 'neutral',
      dueDate: clientData.dueDate || 'Pendiente'
    },
    notes: clientData.notes || 'Contribuyente registrado en el portal. Pendiente de soportes.',
    checklist: JSON.parse(JSON.stringify(DEFAULT_CHECKLIST)),
    documents: [],
    messages: [],
    history: [
      {
        id: 'log_init',
        date: new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        action: 'Contribuyente registrado exitosamente en el portal.'
      }
    ]
  };

  store.users.push(newClient);
  saveStore(store);
  return newClient;
}

export function getAllAdmins() {
  const store = getStore();
  return store.users.filter(u => u.role === 'admin');
}

export function assignClientToAdmin(clientId, adminId) {
  const store = getStore();
  const client = store.users.find(u => u.id === clientId);
  const targetAdmin = store.users.find(u => u.id === adminId && u.role === 'admin');
  
  if (client) {
    client.assignedAdminId = adminId;
    const adminName = targetAdmin ? targetAdmin.name : 'Contador Desconocido';
    addClientLog(client, `Contador asignado actualizado a: ${adminName}`);
    saveStore(store);
    return true;
  }
  return false;
}

export function getAssignedClientsForAdmin(adminUser) {
  const store = getStore();
  const allClients = store.users.filter(u => u.role === 'client');
  if (adminUser && adminUser.isCentralAdmin) {
    return allClients;
  }
  return allClients.filter(c => c.assignedAdminId === adminUser.id);
}

export function toggleCentralAdminStatus(adminId, isCentral) {
  const store = getStore();
  const admin = store.users.find(u => u.id === adminId && u.role === 'admin');
  if (admin) {
    admin.isCentralAdmin = !!isCentral;
    saveStore(store);
    return true;
  }
  return false;
}

export function exportBackupJSON() {
  const store = getStore();
  const jsonStr = JSON.stringify(store, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_taxportal_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
