// MongoDB initialization script
// This script runs when MongoDB container starts

function checkUserExists(db, username) {
    const users = db.getUsers();
    return users.some(user => user.user === username);
}

// Switch to admin database
var adminDb = db.getSiblingDB('admin');

// Check if admin user already exists
if (!checkUserExists(adminDb, 'admin')) {
    print('Creating admin user...');
    adminDb.createUser({
        user: 'admin',
        pwd: 'securepassword',
        roles: [
            { role: 'userAdminAnyDatabase', db: 'admin' },
            { role: 'readWriteAnyDatabase', db: 'admin' },
            { role: 'dbAdminAnyDatabase', db: 'admin' },
            { role: 'clusterAdmin', db: 'admin' }
        ]
    });
    print('Admin user created');
} else {
    print('Admin user already exists, skipping creation');
}

// Authenticate as admin
adminDb.auth('admin', 'securepassword');

// Switch to application database
var appDb = db.getSiblingDB('platform');

// Check if app user already exists
if (!checkUserExists(adminDb, 'appuser')) {
    print('Creating application user...');
    adminDb.createUser({
        user: 'appuser',
        pwd: 'apppassword',
        roles: [
            { role: 'readWrite', db: 'platform' },
            { role: 'dbAdmin', db: 'platform' }
        ]
    });
    print('Application user created');
} else {
    print('Application user already exists, skipping creation');
}

// Create initial collections if they don't exist
var collections = ['users', 'sessions', 'settings'];
collections.forEach(function(collection) {
    if (!appDb.getCollectionNames().includes(collection)) {
        appDb.createCollection(collection);
        print('Created collection: ' + collection);
    } else {
        print('Collection ' + collection + ' already exists, skipping creation');
    }
});

print('MongoDB initialization complete');
