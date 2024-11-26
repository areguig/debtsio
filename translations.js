const translations = {
    en: {
        // Filters
        show: 'Show:',
        allDebts: 'All Debts',
        theyOweMe: 'They Owe Me',
        iOweThem: 'I Owe Them',
        searchContacts: 'Search contacts...',

        // Summary
        summary: 'Summary',
        totalOwed: 'Total Owed to You',
        totalOwe: 'Total You Owe',
        netBalance: 'Net Balance',

        // Debts
        noDebts: 'No debts found.',
        debt: 'debt',
        debts: 'debts',
        dueDate: 'Due date',
        overdue: 'Overdue',
        comments: 'Comments',

        // Actions
        signIn: 'Sign in with Google',
        signOut: 'Sign Out',
        addDebt: 'Add Debt',
        markAsPaid: 'Mark as Paid',
        delete: 'Delete',
        save: 'Save',
        cancel: 'Cancel',

        // Form
        type: 'Type',
        amount: 'Amount',
        contact: 'Contact',
        optional: 'Optional',

        // Confirmations
        confirmPaid: 'Mark this debt as paid?',
        confirmDelete: 'Are you sure you want to delete this debt?',

        // Errors
        errorInitializing: 'Error initializing app. Please refresh the page.',
        errorLoading: 'Error loading debts. Please try again.',
        errorSignIn: 'Failed to sign in. Please try again.',
        errorSignOut: 'Failed to sign out. Please try again.',
        errorNotSignedIn: 'Please sign in to add debts.',
        errorAddingDebt: 'Error adding debt. Please try again.',
        errorDeleting: 'Error deleting debt. Please try again.',

        // Settings
        settings: 'Settings',
        language: 'Language',
        export: 'Export Data',
        exportDescription: 'Download your debts data as a CSV file.',
        exportCSV: 'Export to CSV',
        noDebtsToExport: 'No debts to export.',

        // Dates
        createdAt: 'Created At',

        // Login page
        tagline: 'Track IOUs with ease',
        feature1: 'Track who owes you and who you owe',
        feature2: 'Keep track of due dates',
        feature3: 'See your total balance at a glance',

        // Auth
        signIn: 'Sign In',
        signInWithGoogle: 'Sign in with Google',
        register: 'Register',
        email: 'Email',
        password: 'Password',
        name: 'Name',
        forgotPassword: 'Forgot Password?',
        or: 'or',
        
        // Auth Errors
        errorInvalidEmail: 'Please enter a valid email address.',
        errorWeakPassword: 'Password should be at least 6 characters long.',
        errorEmailInUse: 'This email address is already in use.',
        errorWrongPassword: 'Incorrect password.',
        errorUserNotFound: 'No user found with this email address.',
        errorResetPassword: 'Failed to send password reset email. Please try again.',
        successResetPassword: 'Password reset email sent. Please check your inbox.',
        successRegistration: 'Registration successful! Please log in.',
    },
    fr: {
        // Filters
        show: 'Afficher :',
        allDebts: 'Toutes les dettes',
        theyOweMe: 'On me doit',
        iOweThem: 'Je dois',
        searchContacts: 'Rechercher des contacts...',

        // Summary
        summary: 'Résumé',
        totalOwed: 'Total qu\'on vous doit',
        totalOwe: 'Total que vous devez',
        netBalance: 'Solde net',

        // Debts
        noDebts: 'Aucune dette trouvée.',
        debt: 'dette',
        debts: 'dettes',
        dueDate: 'Date d\'échéance',
        overdue: 'En retard',
        comments: 'Commentaires',

        // Actions
        signIn: 'Se connecter avec Google',
        signOut: 'Se déconnecter',
        addDebt: 'Ajouter une dette',
        markAsPaid: 'Marquer comme payée',
        delete: 'Supprimer',
        save: 'Enregistrer',
        cancel: 'Annuler',

        // Form
        type: 'Type',
        amount: 'Montant',
        contact: 'Contact',
        optional: 'Optionnel',

        // Confirmations
        confirmPaid: 'Marquer cette dette comme payée ?',
        confirmDelete: 'Êtes-vous sûr de vouloir supprimer cette dette ?',

        // Errors
        errorInitializing: 'Erreur lors de l\'initialisation. Veuillez actualiser la page.',
        errorLoading: 'Erreur lors du chargement des dettes. Veuillez réessayer.',
        errorSignIn: 'Échec de la connexion. Veuillez réessayer.',
        errorSignOut: 'Échec de la déconnexion. Veuillez réessayer.',
        errorNotSignedIn: 'Veuillez vous connecter pour ajouter des dettes.',
        errorAddingDebt: 'Erreur lors de l\'ajout de la dette. Veuillez réessayer.',
        errorDeleting: 'Erreur lors de la suppression de la dette. Veuillez réessayer.',

        // Settings
        settings: 'Paramètres',
        language: 'Langue',
        export: 'Exporter les données',
        exportDescription: 'Télécharger vos dettes au format CSV.',
        exportCSV: 'Exporter en CSV',
        noDebtsToExport: 'Aucune dette à exporter.',

        // Dates
        createdAt: 'Créé le',

        // Login page
        tagline: 'Gérez vos dettes facilement',
        feature1: 'Suivez qui vous doit et ce que vous devez',
        feature2: 'Gardez un œil sur les échéances',
        feature3: 'Visualisez votre solde en un coup d\'œil',

        // Auth
        signIn: 'Se connecter',
        signInWithGoogle: 'Se connecter avec Google',
        register: 'S\'inscrire',
        email: 'Email',
        password: 'Mot de passe',
        name: 'Nom',
        forgotPassword: 'Mot de passe oublié ?',
        or: 'ou',
        
        // Auth Errors
        errorInvalidEmail: 'Veuillez entrer une adresse email valide.',
        errorWeakPassword: 'Le mot de passe doit contenir au moins 6 caractères.',
        errorEmailInUse: 'Cette adresse email est déjà utilisée.',
        errorWrongPassword: 'Mot de passe incorrect.',
        errorUserNotFound: 'Aucun utilisateur trouvé avec cette adresse email.',
        errorResetPassword: 'Échec de l\'envoi de l\'email de réinitialisation. Veuillez réessayer.',
        successResetPassword: 'Email de réinitialisation envoyé. Veuillez vérifier votre boîte de réception.',
        successRegistration: 'Inscription réussie ! Veuillez vous connecter.',
    }
};

export function t(key, lang = getCurrentLanguage()) {
    return translations[lang]?.[key] || translations.en[key] || key;
}

export function getCurrentLanguage() {
    return localStorage.getItem('language') || 'en';
}

export function setLanguage(lang) {
    localStorage.setItem('language', lang);
    document.documentElement.setAttribute('lang', lang);
    window.dispatchEvent(new Event('languagechange'));
}

export function formatCurrency(amount, lang = getCurrentLanguage()) {
    const formatter = new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    return formatter.format(amount);
}

export function formatDate(dateString, lang = getCurrentLanguage()) {
    const date = new Date(dateString);
    return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
