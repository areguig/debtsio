import { t, getCurrentLanguage, setLanguage, formatCurrency, formatDate } from './translations.js';
import * as db from './db.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    signInWithPopup,
    GoogleAuthProvider,
    browserLocalPersistence,
    setPersistence
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Initialize Firebase with worker config
let firebaseConfig = null;
let auth = null;
let isOnline = navigator.onLine;

async function initializeFirebaseApp() {
    try {
        // Get config from worker
        const response = await fetch('https://moneyio.akli-reguig.workers.dev/config');
        firebaseConfig = await response.json();
        
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        
        // Initialize IndexedDB
        await db.initDB();
        
        // Set persistence to local
        await setPersistence(auth, browserLocalPersistence);
        
        // Setup auth listeners after Firebase is initialized
        setupAuthListeners();
        setupNetworkListeners();
        
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
        alert(t('errorInitializing'));
    }
}

// Network status handlers
function setupNetworkListeners() {
    const offlineBanner = document.getElementById('offline-banner');
    
    db.addOnlineListener(() => {
        isOnline = true;
        offlineBanner.style.display = 'none';
        syncPendingChanges();
    });
    
    db.addOfflineListener(() => {
        isOnline = false;
        offlineBanner.style.display = 'flex';
    });
}

// Sync pending changes when back online
async function syncPendingChanges() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-debts');
        } catch (error) {
            console.error('Error registering sync:', error);
        }
    }
}

// Firestore REST API helpers
async function getIdToken() {
    const user = auth.currentUser;
    if (!user) throw new Error('No user signed in');
    return user.getIdToken();
}

async function firestoreRequest(path, options = {}) {
    const token = await getIdToken();
    const workerUrl = 'https://moneyio.akli-reguig.workers.dev/firestore';
    const url = path.startsWith(':') 
        ? `${workerUrl}${path}`
        : `${workerUrl}/${path}`;
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        throw new Error(`Firestore request failed: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    return response.text();
}

// Load and display debts
async function loadDebts() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        let debts = [];
        
        if (isOnline) {
            // Try to load from Firestore
            try {
                const queryParams = new URLSearchParams({
                    'orderBy': 'createdAt desc',
                    'pageSize': '100'
                });
                
                const response = await firestoreRequest(`debts?${queryParams.toString()}`);

                debts = response.documents
                    ? response.documents
                        .filter(doc => {
                            const fields = doc.fields || {};
                            return fields.userId?.stringValue === user.uid;
                        })
                        .map(doc => ({
                            id: doc.name.split('/').pop(),
                            type: doc.fields.type.stringValue,
                            amount: parseFloat(doc.fields.amount.doubleValue || doc.fields.amount.integerValue || 0),
                            contact: doc.fields.contact.stringValue,
                            dueDate: doc.fields.dueDate?.stringValue || null,
                            comments: doc.fields.comments?.stringValue || '',
                            createdAt: doc.fields.createdAt.stringValue,
                            userId: user.uid
                        }))
                    : [];
                
                // Update local database
                for (const debt of debts) {
                    await db.addDebt(debt);
                }
            } catch (error) {
                console.error('Error loading from Firestore:', error);
            }
        }
        
        // Load from local database
        debts = await db.getDebts(user.uid);
        
        currentDebts = debts;
        filterDebts();
        updateSummary(currentDebts);
    } catch (error) {
        debtsList.innerHTML = `<p class="error">${t('errorLoading')}</p>`;
    }
}

// DOM elements
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const loginSection = document.getElementById('login-section');
const userSection = document.getElementById('user-section');
const userNameSpan = document.getElementById('user-name');
const addDebtButton = document.getElementById('add-debt-button');
const addDebtModal = document.getElementById('add-debt-modal');
const debtForm = document.getElementById('debt-form');
const cancelDebtButton = document.getElementById('cancel-debt');
const debtsList = document.getElementById('debts-list');
const typeFilter = document.getElementById('type-filter');
const contactSearch = document.getElementById('contact-search');

let currentDebts = [];
let filteredDebts = [];

// Setup filters
typeFilter.addEventListener('change', filterDebts);
contactSearch.addEventListener('input', filterDebts);

function filterDebts() {
    const typeValue = typeFilter.value;
    const searchValue = contactSearch.value.toLowerCase().trim();
    
    filteredDebts = currentDebts.filter(debt => {
        const matchesType = typeValue === 'all' || debt.type === typeValue;
        const matchesSearch = !searchValue || debt.contact.toLowerCase().includes(searchValue);
        return matchesType && matchesSearch;
    });
    
    displayDebts(filteredDebts);
}

// Update summary display
function updateSummary(debts) {
    const totalOwed = debts
        .filter(d => d.type === 'owed')
        .reduce((sum, d) => sum + d.amount, 0);
        
    const totalOwe = debts
        .filter(d => d.type === 'owe')
        .reduce((sum, d) => sum + d.amount, 0);
        
    const netBalance = totalOwed - totalOwe;

    // Update totals
    document.getElementById('total-owed').textContent = formatCurrency(totalOwed);
    document.getElementById('total-owe').textContent = formatCurrency(totalOwe);
    
    const netBalanceEl = document.getElementById('net-balance');
    netBalanceEl.textContent = formatCurrency(Math.abs(netBalance));
    netBalanceEl.className = `stat-value ${netBalance >= 0 ? 'positive' : 'negative'}`;
}

// Setup auth event listeners
function setupAuthListeners() {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');

    loginButton.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            alert(t('errorSignIn'));
        }
    });

    logoutButton.addEventListener('click', async () => {
        try {
            await auth.signOut();
        } catch (error) {
            alert(t('errorSignOut'));
        }
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            loginSection.style.display = 'none';
            userSection.style.display = 'block';
            userNameSpan.textContent = user.displayName || user.email;
            loadDebts();
        } else {
            loginSection.style.display = 'block';
            userSection.style.display = 'none';
            userNameSpan.textContent = '';
            debtsList.innerHTML = '';
        }
    });
}

// Modal handlers
addDebtButton.addEventListener('click', () => {
    addDebtModal.classList.add('active');
});

cancelDebtButton.addEventListener('click', () => {
    addDebtModal.classList.remove('active');
    debtForm.reset();
});

// Add debt with offline support
debtForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        alert(t('errorNotSignedIn'));
        return;
    }

    const formData = new FormData(debtForm);
    const debtData = {
        type: formData.get('type'),
        amount: parseFloat(formData.get('amount')),
        contact: formData.get('contact'),
        dueDate: formData.get('due-date') || null,
        comments: formData.get('comments') || '',
        createdAt: new Date().toISOString(),
        userId: user.uid
    };

    try {
        // Generate a unique ID
        debtData.id = crypto.randomUUID();
        
        // Save to local database
        await db.addDebt(debtData);
        
        if (isOnline) {
            // Try to save to Firestore
            try {
                await firestoreRequest('debts', {
                    method: 'POST',
                    body: JSON.stringify(debtData)
                });
            } catch (error) {
                // Store the change for later sync
                await db.addPendingChange({
                    url: 'https://moneyio.akli-reguig.workers.dev/firestore/debts',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await getIdToken()}`
                    },
                    body: JSON.stringify(debtData)
                });
            }
        } else {
            // Store the change for later sync
            await db.addPendingChange({
                url: 'https://moneyio.akli-reguig.workers.dev/firestore/debts',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getIdToken()}`
                },
                body: JSON.stringify(debtData)
            });
        }
        
        addDebtModal.classList.remove('active');
        debtForm.reset();
        await loadDebts();
    } catch (error) {
        alert(t('errorAddingDebt'));
    }
});

// Update translations
function updateTranslations() {
    document.querySelectorAll('[data-t]').forEach(element => {
        const key = element.dataset.t;
        if (element.dataset.tAttr) {
            element.setAttribute(element.dataset.tAttr, t(key));
        } else {
            element.textContent = t(key);
        }
    });
    
    // Refresh the debts display to update formatting
    if (typeof currentDebts !== 'undefined' && currentDebts.length > 0) {
        displayDebts(filteredDebts);
        updateSummary(currentDebts);
    }
}

// Language selection
const languageButtons = document.querySelectorAll('.language-button');

languageButtons.forEach(button => {
    button.addEventListener('click', () => {
        const lang = button.dataset.lang;
        setLanguage(lang);
        
        // Update active state of buttons
        languageButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        
        // Update all translations
        updateTranslations();
    });
});

// Set initial active language button
document.addEventListener('DOMContentLoaded', () => {
    const currentLang = getCurrentLanguage();
    languageButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
    updateTranslations();
});

// Language dropdown handlers
const languageDropdowns = document.querySelectorAll('.language-dropdown');
const flagEmojis = { en: '🇬🇧', fr: '🇫🇷' };

languageDropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.lang-toggle');
    const currentFlag = toggle.querySelector('.current-flag');
    
    // Toggle dropdown
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        dropdown.classList.add('active');
    });

    // Handle language selection
    dropdown.querySelectorAll('.lang-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const lang = option.dataset.lang;
            updateLanguage(lang);
            currentFlag.textContent = flagEmojis[lang];
            closeAllDropdowns();
        });
    });
});

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
    closeAllDropdowns();
});

function closeAllDropdowns() {
    languageDropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}

// Update event listeners to use translations
window.markAsPaid = function(debtId, event) {
    event.stopPropagation();
    if (!confirm(t('confirmPaid'))) return;
    
    firestoreRequest(`debts/${debtId}`, {
        method: 'DELETE'
    }).then(() => {
        loadDebts();
    }).catch(error => {
        alert(t('errorDeleting'));
    });
};

window.deleteDebt = function(debtId, event) {
    event.stopPropagation();
    if (!confirm(t('confirmDelete'))) return;
    
    firestoreRequest(`debts/${debtId}`, {
        method: 'DELETE'
    }).then(() => {
        loadDebts();
    }).catch(error => {
        alert(t('errorDeleting'));
    });
};

// Update display functions to use translations
function createContactCard(group) {
    const card = document.createElement('div');
    card.className = 'contact-card';
    
    card.innerHTML = `
        <div class="contact-card-header" onclick="toggleContactDetails(this, event)">
            <div class="contact-info">
                <h3 class="contact-name">${group.contact}</h3>
                <span class="debt-count">${group.debts.length} ${t(group.debts.length === 1 ? 'debt' : 'debts')}</span>
            </div>
            <div class="contact-total">
                <span class="total-amount ${group.debts[0].type}">${formatCurrency(group.totalAmount)}</span>
                <span class="material-icons expand-icon">expand_more</span>
            </div>
        </div>
        <div class="contact-debts">
            ${group.debts.map(debt => `
                <div class="debt-item" onclick="toggleDebtDetails(this, event)">
                    <div class="debt-summary">
                        <span class="debt-amount ${debt.type}">${formatCurrency(debt.amount)}</span>
                        <span class="debt-date">${formatDate(debt.createdAt)}</span>
                    </div>
                    <div class="debt-details">
                        ${debt.dueDate ? `
                            <div class="due-date ${isOverdue(debt.dueDate) ? 'overdue' : ''}">
                                ${t('dueDate')}: ${formatDate(debt.dueDate)}
                                ${isOverdue(debt.dueDate) ? `<span class="overdue-text">(${t('overdue')})</span>` : ''}
                            </div>
                        ` : ''}
                        ${debt.comments ? `
                            <div class="debt-comments">
                                <strong>${t('comments')}:</strong><br>
                                ${debt.comments}
                            </div>
                        ` : ''}
                        <div class="debt-actions">
                            <button onclick="markAsPaid('${debt.id}', event)" class="action-button">
                                <span class="material-icons">done</span>
                                ${t('markAsPaid')}
                            </button>
                            <button onclick="deleteDebt('${debt.id}', event)" class="action-button">
                                <span class="material-icons">delete</span>
                                ${t('delete')}
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    return card;
}

// Display debts
function displayDebts(debts) {
    // Update summary first
    updateSummary(debts);

    // Then display the grouped list
    debtsList.innerHTML = '';
    if (debts.length === 0) {
        debtsList.innerHTML = `<p class="no-debts">${t('noDebts')}</p>`;
        return;
    }

    const groupedDebts = groupDebtsByContact(debts);
    
    Object.values(groupedDebts).forEach(group => {
        debtsList.appendChild(createContactCard(group));
    });
}

// Group debts by contact
function groupDebtsByContact(debts) {
    return debts.reduce((groups, debt) => {
        const contact = debt.contact;
        if (!groups[contact]) {
            groups[contact] = {
                contact,
                totalAmount: 0,
                debts: []
            };
        }
        groups[contact].debts.push(debt);
        groups[contact].totalAmount += debt.amount;
        return groups;
    }, {});
}

// Check if date is overdue
function isOverdue(dateString) {
    return new Date(dateString) < new Date();
}

// Toggle contact details
window.toggleContactDetails = function(header, event) {
    event.stopPropagation();
    const card = header.closest('.contact-card');
    const icon = header.querySelector('.expand-icon');
    
    card.classList.toggle('expanded');
    icon.textContent = card.classList.contains('expanded') ? 'expand_less' : 'expand_more';
};

// Toggle debt details
window.toggleDebtDetails = function(debtItem, event) {
    event.stopPropagation();
    const details = debtItem.querySelector('.debt-details');
    
    // If already expanded, collapse
    if (debtItem.classList.contains('expanded')) {
        debtItem.classList.remove('expanded');
        return;
    }
    
    // Collapse any other expanded items in the same contact card
    const card = debtItem.closest('.contact-card');
    card.querySelectorAll('.debt-item.expanded').forEach(item => {
        if (item !== debtItem) {
            item.classList.remove('expanded');
        }
    });
    
    // Expand this item
    debtItem.classList.add('expanded');
};

// Settings modal handlers
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsButton = settingsModal.querySelector('.close-button');
const exportButton = document.getElementById('export-csv');

settingsButton.addEventListener('click', () => {
    settingsModal.classList.add('active');
    updateLanguageButtons();
});

closeSettingsButton.addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

// Close modal when clicking outside
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
});

// Update language buttons
function updateLanguageButtons() {
    const currentLang = getCurrentLanguage();
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
}

// CSV Export
exportButton.addEventListener('click', exportToCSV);

function exportToCSV() {
    if (!currentDebts.length) {
        alert(t('noDebtsToExport'));
        return;
    }

    const csvContent = generateCSV(currentDebts);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const fileName = `moneyio_debts_${new Date().toISOString().split('T')[0]}.csv`;

    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, fileName);
    } else {
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function generateCSV(debts) {
    const currentLang = getCurrentLanguage();
    const headers = [
        t('type'),
        t('amount'),
        t('contact'),
        t('dueDate'),
        t('comments'),
        t('createdAt')
    ];

    const rows = debts.map(debt => [
        t(debt.type === 'owed' ? 'theyOweMe' : 'iOweThem'),
        formatCurrency(debt.amount),
        debt.contact,
        debt.dueDate ? formatDate(debt.dueDate) : '',
        debt.comments || '',
        formatDate(debt.createdAt)
    ]);

    return [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
}

// Contact suggestions
const contactInput = document.getElementById('contact-input');
const suggestionsContainer = document.getElementById('contact-suggestions');
let selectedSuggestionIndex = -1;
let suggestions = [];

function getUniqueContacts() {
    const uniqueContacts = new Map();
    currentDebts.forEach(debt => {
        if (!uniqueContacts.has(debt.contact)) {
            uniqueContacts.set(debt.contact, 1);
        } else {
            uniqueContacts.set(debt.contact, uniqueContacts.get(debt.contact) + 1);
        }
    });
    return Array.from(uniqueContacts.entries())
        .map(([contact, count]) => ({ contact, count }))
        .sort((a, b) => b.count - a.count);
}

function showSuggestions(inputValue) {
    const contacts = getUniqueContacts();
    suggestions = contacts.filter(({ contact }) => 
        contact.toLowerCase().includes(inputValue.toLowerCase())
    );

    if (suggestions.length === 0 || !inputValue) {
        suggestionsContainer.classList.remove('active');
        return;
    }

    suggestionsContainer.innerHTML = suggestions
        .map(({ contact, count }, index) => `
            <div class="suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}" 
                 data-index="${index}">
                <span class="material-icons">person</span>
                <div class="suggestion-info">
                    <span class="suggestion-name">${contact}</span>
                    <span class="suggestion-count">${count} ${t(count === 1 ? 'debt' : 'debts')}</span>
                </div>
            </div>
        `)
        .join('');

    suggestionsContainer.classList.add('active');

    // Add click handlers
    suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            contactInput.value = suggestions[item.dataset.index].contact;
            suggestionsContainer.classList.remove('active');
        });

        item.addEventListener('mouseenter', () => {
            selectedSuggestionIndex = parseInt(item.dataset.index);
            updateSelectedSuggestion();
        });
    });
}

function updateSelectedSuggestion() {
    const items = suggestionsContainer.querySelectorAll('.suggestion-item');
    items.forEach(item => item.classList.remove('selected'));
    
    if (selectedSuggestionIndex >= 0 && items[selectedSuggestionIndex]) {
        items[selectedSuggestionIndex].classList.add('selected');
        items[selectedSuggestionIndex].scrollIntoView({ block: 'nearest' });
    }
}

// Contact input event listeners
contactInput.addEventListener('input', (e) => {
    selectedSuggestionIndex = -1;
    showSuggestions(e.target.value);
});

contactInput.addEventListener('keydown', (e) => {
    if (!suggestionsContainer.classList.contains('active')) return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedSuggestionIndex = Math.min(
                selectedSuggestionIndex + 1,
                suggestions.length - 1
            );
            updateSelectedSuggestion();
            break;

        case 'ArrowUp':
            e.preventDefault();
            selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, 0);
            updateSelectedSuggestion();
            break;

        case 'Enter':
            e.preventDefault();
            if (selectedSuggestionIndex >= 0) {
                contactInput.value = suggestions[selectedSuggestionIndex].contact;
                suggestionsContainer.classList.remove('active');
            }
            break;

        case 'Escape':
            suggestionsContainer.classList.remove('active');
            break;
    }
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!contactInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
        suggestionsContainer.classList.remove('active');
    }
});

// Auth UI handlers
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const forgotPasswordButton = document.getElementById('forgot-password');

// Switch between login and register forms
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const formId = tab.dataset.tab;
        
        // Update active tab
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show selected form
        loginForm.style.display = formId === 'login' ? 'flex' : 'none';
        registerForm.style.display = formId === 'register' ? 'flex' : 'none';
    });
});

// Handle login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!auth) {
        alert(t('errorInitializing'));
        return;
    }
    
    const email = loginForm.querySelector('[name="email"]').value;
    const password = loginForm.querySelector('[name="password"]').value;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Login successful:', userCredential.user.email);
    } catch (error) {
        console.error('Login error:', error);
        switch (error.code) {
            case 'auth/invalid-email':
                alert(t('errorInvalidEmail'));
                break;
            case 'auth/user-not-found':
                alert(t('errorUserNotFound'));
                break;
            case 'auth/wrong-password':
                alert(t('errorWrongPassword'));
                break;
            default:
                alert(error.message);
        }
    }
});

// Handle registration form submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = registerForm.querySelector('[name="name"]').value;
    const email = registerForm.querySelector('[name="email"]').value;
    const password = registerForm.querySelector('[name="password"]').value;
    
    try {
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update profile with name
        await updateProfile(userCredential.user, {
            displayName: name
        });
        
        // Show success message and switch to login
        alert(t('successRegistration'));
        authTabs[0].click();
    } catch (error) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                alert(t('errorEmailInUse'));
                break;
            case 'auth/invalid-email':
                alert(t('errorInvalidEmail'));
                break;
            case 'auth/weak-password':
                alert(t('errorWeakPassword'));
                break;
            default:
                alert(error.message);
        }
    }
});

// Handle forgot password
forgotPasswordButton.addEventListener('click', async () => {
    const email = loginForm.querySelector('[name="email"]').value;
    
    if (!email) {
        alert(t('errorInvalidEmail'));
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        alert(t('successResetPassword'));
    } catch (error) {
        alert(t('errorResetPassword'));
    }
});

// Initialize the app
initializeFirebaseApp();
