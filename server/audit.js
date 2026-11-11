'use strict';

function log(store, user, action, entity, entityId, details) {
  return store.insert('auditLog', {
    at: new Date().toISOString(),
    userId: user ? user.id : null,
    userEmail: user ? user.email : 'system',
    action: action,
    entity: entity,
    entityId: entityId == null ? null : entityId,
    details: details || ''
  });
}

module.exports = { log: log };
