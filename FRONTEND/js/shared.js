/**
 * HRMS Shared Components
 * Reusable UI components and utilities for all pages
 * Version: 1.0.0
 */

// ============================================================
//  CONFIGURATION
// ============================================================
const SHARED_CONFIG = {
    toastDuration: 3000,
    modalAnimationDuration: 300,
    dateFormat: 'MMM DD, YYYY',
    timeFormat: 'HH:mm',
    currencySymbol: '$',
    dateLocale: 'en-US'
};

// ============================================================
//  DOM UTILITIES
// ============================================================
const DOM = {
    /**
     * Get element by selector
     */
    get: (selector, context = document) => context.querySelector(selector),
    
    /**
     * Get all elements by selector
     */
    getAll: (selector, context = document) => [...context.querySelectorAll(selector)],
    
    /**
     * Create element with attributes and content
     */
    create: (tag, attributes = {}, content = '') => {
        const el = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                el.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    el.dataset[dataKey] = dataValue;
                });
            } else if (key === 'style') {
                Object.entries(value).forEach(([styleKey, styleValue]) => {
                    el.style[styleKey] = styleValue;
                });
            } else if (key === 'events') {
                Object.entries(value).forEach(([event, handler]) => {
                    el.addEventListener(event, handler);
                });
            } else {
                el[key] = value;
            }
        });
        if (content) {
            el.innerHTML = content;
        }
        return el;
    },
    
    /**
     * Add or remove class
     */
    toggleClass: (el, className, force = null) => {
        if (force === null) {
            el.classList.toggle(className);
        } else if (force) {
            el.classList.add(className);
        } else {
            el.classList.remove(className);
        }
    },
    
    /**
     * Show element
     */
    show: (el) => {
        if (typeof el === 'string') el = document.getElementById(el);
        if (el) el.style.display = '';
    },
    
    /**
     * Hide element
     */
    hide: (el) => {
        if (typeof el === 'string') el = document.getElementById(el);
        if (el) el.style.display = 'none';
    },
    
    /**
     * Toggle element visibility
     */
    toggle: (el) => {
        if (typeof el === 'string') el = document.getElementById(el);
        if (el) {
            el.style.display = el.style.display === 'none' ? '' : 'none';
        }
    },
    
    /**
     * Empty element content
     */
    empty: (el) => {
        if (typeof el === 'string') el = document.getElementById(el);
        if (el) el.innerHTML = '';
    },
    
    /**
     * Append child or children
     */
    append: (parent, children) => {
        if (typeof parent === 'string') parent = document.getElementById(parent);
        if (!parent) return;
        const items = Array.isArray(children) ? children : [children];
        items.forEach(child => {
            if (typeof child === 'string') {
                parent.insertAdjacentHTML('beforeend', child);
            } else {
                parent.appendChild(child);
            }
        });
    }
};

// ============================================================
//  TOAST NOTIFICATION SYSTEM
// ============================================================
class ToastSystem {
    constructor() {
        this.container = null;
        this.duration = SHARED_CONFIG.toastDuration;
        this.init();
    }

    /**
     * Initialize toast container
     */
    init() {
        if (!this.container) {
            this.container = DOM.create('div', {
                className: 'toast-container fixed top-4 right-4 z-50 space-y-2',
                id: 'toastContainer'
            });
            document.body.appendChild(this.container);
        }
    }

    /**
     * Show toast notification
     */
    show(message, type = 'success', duration = null) {
        const time = duration || this.duration;
        const iconMap = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const toast = DOM.create('div', {
            className: `toast toast-${type} px-6 py-3 rounded shadow-lg text-white flex items-center gap-3`,
            style: { animation: 'slideInRight 0.3s ease' }
        });

        toast.innerHTML = `
            <span class="text-xl">${iconMap[type] || '📢'}</span>
            <span>${message}</span>
        `;

        this.container.appendChild(toast);

        // Auto dismiss
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }, time);

        return toast;
    }

    /**
     * Success toast
     */
    success(message, duration = null) {
        return this.show(message, 'success', duration);
    }

    /**
     * Error toast
     */
    error(message, duration = null) {
        return this.show(message, 'error', duration);
    }

    /**
     * Warning toast
     */
    warning(message, duration = null) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Info toast
     */
    info(message, duration = null) {
        return this.show(message, 'info', duration);
    }

    /**
     * Clear all toasts
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// ============================================================
//  MODAL SYSTEM
// ============================================================
class ModalSystem {
    constructor() {
        this.activeModals = [];
        this.overlay = null;
        this.animationDuration = SHARED_CONFIG.modalAnimationDuration;
    }

    /**
     * Create modal
     */
    create(options = {}) {
        const {
            title = 'Modal',
            content = '',
            size = 'md',
            onConfirm = null,
            onCancel = null,
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            showFooter = true,
            closeOnOverlay = true
        } = options;

        const sizeClasses = {
            sm: 'max-w-md',
            md: 'max-w-lg',
            lg: 'max-w-2xl',
            xl: 'max-w-4xl',
            full: 'max-w-full mx-4'
        };

        // Create overlay
        const overlay = DOM.create('div', {
            className: 'modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
            style: { animation: 'fadeIn 0.2s ease' }
        });

        // Create modal
        const modal = DOM.create('div', {
            className: `modal bg-white rounded-xl shadow-xl w-full ${sizeClasses[size] || sizeClasses.md} max-h-[90vh] overflow-y-auto`,
            style: { animation: 'slideUp 0.3s ease' }
        });

        // Header
        const header = DOM.create('div', {
            className: 'modal-header flex justify-between items-center p-4 border-b border-gray-200'
        });
        header.innerHTML = `
            <h3 class="text-xl font-bold text-gray-800">${title}</h3>
            <button class="modal-close text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        `;

        // Body
        const body = DOM.create('div', {
            className: 'modal-body p-4'
        });
        body.innerHTML = content;

        // Footer
        const footer = DOM.create('div', {
            className: 'modal-footer flex gap-3 p-4 border-t border-gray-200 justify-end'
        });

        if (showFooter) {
            const cancelBtn = DOM.create('button', {
                className: 'btn btn-outline px-4 py-2 rounded transition',
                textContent: cancelText,
                events: {
                    click: () => {
                        if (onCancel) onCancel();
                        this.close(modal);
                    }
                }
            });

            const confirmBtn = DOM.create('button', {
                className: 'btn btn-primary px-4 py-2 rounded transition',
                textContent: confirmText,
                events: {
                    click: () => {
                        if (onConfirm) {
                            const result = onConfirm();
                            if (result !== false) {
                                this.close(modal);
                            }
                        } else {
                            this.close(modal);
                        }
                    }
                }
            });

            footer.appendChild(cancelBtn);
            footer.appendChild(confirmBtn);
        }

        // Assemble modal
        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Store reference
        const modalData = {
            overlay,
            modal,
            closeOnOverlay
        };
        this.activeModals.push(modalData);

        // Close on overlay click
        if (closeOnOverlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    if (onCancel) onCancel();
                    this.close(modal);
                }
            });
        }

        // Close button
        const closeBtn = header.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (onCancel) onCancel();
                this.close(modal);
            });
        }

        // Escape key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                if (onCancel) onCancel();
                this.close(modal);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Store esc handler for cleanup
        modalData.escHandler = escHandler;

        return modal;
    }

    /**
     * Close modal
     */
    close(modalElement) {
        const index = this.activeModals.findIndex(m => m.modal === modalElement);
        if (index === -1) return;

        const modalData = this.activeModals[index];
        
        // Remove esc handler
        if (modalData.escHandler) {
            document.removeEventListener('keydown', modalData.escHandler);
        }

        // Animate out
        modalData.overlay.style.opacity = '0';
        modalData.modal.style.transform = 'scale(0.95)';
        modalData.modal.style.opacity = '0';

        setTimeout(() => {
            if (modalData.overlay.parentNode) {
                modalData.overlay.remove();
            }
            this.activeModals.splice(index, 1);
        }, this.animationDuration);
    }

    /**
     * Close all modals
     */
    closeAll() {
        this.activeModals.forEach(modalData => {
            if (modalData.escHandler) {
                document.removeEventListener('keydown', modalData.escHandler);
            }
            if (modalData.overlay.parentNode) {
                modalData.overlay.remove();
            }
        });
        this.activeModals = [];
    }

    /**
     * Simple alert modal
     */
    alert(message, title = 'Alert') {
        return new Promise((resolve) => {
            this.create({
                title,
                content: `<p class="text-gray-600">${message}</p>`,
                confirmText: 'OK',
                onConfirm: resolve,
                cancelText: ''
            });
        });
    }

    /**
     * Simple confirm modal
     */
    confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            this.create({
                title,
                content: `<p class="text-gray-600">${message}</p>`,
                confirmText: 'Yes',
                cancelText: 'No',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    }

    /**
     * Prompt modal with input
     */
    prompt(message, title = 'Input', defaultValue = '') {
        return new Promise((resolve) => {
            this.create({
                title,
                content: `
                    <p class="text-gray-600 mb-3">${message}</p>
                    <input type="text" id="promptInput" class="form-control w-full" value="${defaultValue}" />
                `,
                confirmText: 'OK',
                cancelText: 'Cancel',
                onConfirm: () => {
                    const input = document.getElementById('promptInput');
                    resolve(input ? input.value : defaultValue);
                },
                onCancel: () => resolve(null)
            });
        });
    }

    /**
     * Form modal
     */
    form(options = {}) {
        const {
            title = 'Form',
            fields = [],
            onSubmit = null,
            submitText = 'Submit',
            cancelText = 'Cancel'
        } = options;

        let formHtml = '<form id="modalForm" class="space-y-4">';
        fields.forEach(field => {
            const required = field.required ? 'required' : '';
            const value = field.value || '';
            formHtml += `
                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        ${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}
                    </label>
                    ${field.type === 'textarea' ? `
                        <textarea id="field_${field.name}" class="form-control w-full" ${required} placeholder="${field.placeholder || ''}">${value}</textarea>
                    ` : field.type === 'select' ? `
                        <select id="field_${field.name}" class="form-control w-full" ${required}>
                            ${field.options.map(opt => `
                                <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>
                            `).join('')}
                        </select>
                    ` : `
                        <input type="${field.type || 'text'}" id="field_${field.name}" class="form-control w-full" ${required} placeholder="${field.placeholder || ''}" value="${value}" />
                    `}
                </div>
            `;
        });
        formHtml += '</form>';

        return new Promise((resolve) => {
            this.create({
                title,
                content: formHtml,
                confirmText: submitText,
                cancelText: cancelText,
                onConfirm: () => {
                    const form = document.getElementById('modalForm');
                    if (!form) {
                        resolve(null);
                        return;
                    }
                    const formData = {};
                    fields.forEach(field => {
                        const input = document.getElementById(`field_${field.name}`);
                        if (input) {
                            formData[field.name] = input.value;
                        }
                    });
                    if (onSubmit) {
                        const result = onSubmit(formData);
                        if (result === false) return false;
                    }
                    resolve(formData);
                },
                onCancel: () => resolve(null)
            });
        });
    }
}

// ============================================================
//  LOADING SPINNER
// ============================================================
class LoadingSpinner {
    constructor() {
        this.overlay = null;
        this.count = 0;
    }

    /**
     * Show spinner
     */
    show(message = 'Loading...') {
        this.count++;
        if (this.overlay) {
            // Update message if overlay exists
            const msgEl = this.overlay.querySelector('.loading-message');
            if (msgEl) msgEl.textContent = message;
            return;
        }

        this.overlay = DOM.create('div', {
            className: 'fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-[9999]',
            style: { animation: 'fadeIn 0.2s ease' }
        });

        const spinner = DOM.create('div', {
            className: 'loading loading-lg mb-4',
            style: { display: 'inline-block' }
        });

        const msg = DOM.create('div', {
            className: 'loading-message text-white text-lg font-medium'
        });
        msg.textContent = message;

        this.overlay.appendChild(spinner);
        this.overlay.appendChild(msg);
        document.body.appendChild(this.overlay);
    }

    /**
     * Hide spinner
     */
    hide() {
        this.count = Math.max(0, this.count - 1);
        if (this.count === 0 && this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    /**
     * Force hide all spinners
     */
    forceHide() {
        this.count = 0;
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}

// ============================================================
//  DATE & TIME UTILITIES
// ============================================================
const DateTime = {
    /**
     * Format date
     */
    formatDate: (date, format = SHARED_CONFIG.dateFormat) => {
        if (!date) return 'N/A';
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return 'Invalid Date';
        return d.toLocaleDateString(SHARED_CONFIG.dateLocale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    },

    /**
     * Format time
     */
    formatTime: (time, format = SHARED_CONFIG.timeFormat) => {
        if (!time) return 'N/A';
        if (typeof time === 'string' && time.includes(':')) {
            const parts = time.split(':');
            const hours = parseInt(parts[0]);
            const minutes = parts[1];
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const hour12 = hours % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        }
        return time;
    },

    /**
     * Format date and time
     */
    formatDateTime: (dateTime) => {
        if (!dateTime) return 'N/A';
        const d = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
        if (isNaN(d.getTime())) return 'Invalid Date';
        return `${DateTime.formatDate(d)} at ${DateTime.formatTime(d.toTimeString().slice(0, 8))}`;
    },

    /**
     * Get relative time (e.g., "2 days ago")
     */
    relativeTime: (date) => {
        if (!date) return 'N/A';
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return 'Invalid Date';
        
        const now = new Date();
        const diff = now - d;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (seconds < 60) return 'just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
        return `${years} year${years > 1 ? 's' : ''} ago`;
    },

    /**
     * Get days between dates
     */
    daysBetween: (start, end) => {
        const startDate = typeof start === 'string' ? new Date(start) : start;
        const endDate = typeof end === 'string' ? new Date(end) : end;
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
        const diffTime = Math.abs(endDate - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    },

    /**
     * Get current date in YYYY-MM-DD format
     */
    today: () => new Date().toISOString().split('T')[0],

    /**
     * Get current month/year
     */
    currentMonthYear: () => ({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    }),

    /**
     * Get month name
     */
    monthName: (month) => {
        const names = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return names[month - 1] || month;
    },

    /**
     * Get month days
     */
    daysInMonth: (month, year) => {
        return new Date(year, month, 0).getDate();
    }
};

// ============================================================
//  STRING UTILITIES
// ============================================================
const Strings = {
    /**
     * Capitalize first letter
     */
    capitalize: (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    /**
     * Capitalize each word
     */
    titleCase: (str) => {
        if (!str) return '';
        return str.split(' ').map(word => Strings.capitalize(word)).join(' ');
    },

    /**
     * Truncate string
     */
    truncate: (str, length = 50, suffix = '...') => {
        if (!str || str.length <= length) return str;
        return str.slice(0, length) + suffix;
    },

    /**
     * Slugify string
     */
    slugify: (str) => {
        if (!str) return '';
        return str.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    /**
     * Generate random string
     */
    random: (length = 8) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * Mask email (e.g., j***@example.com)
     */
    maskEmail: (email) => {
        if (!email) return '';
        const parts = email.split('@');
        if (parts.length !== 2) return email;
        const name = parts[0];
        const domain = parts[1];
        if (name.length <= 2) return email;
        return `${name.slice(0, 1)}${'*'.repeat(Math.min(name.length - 2, 4))}${name.slice(-1)}@${domain}`;
    },

    /**
     * Mask phone number
     */
    maskPhone: (phone) => {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length < 7) return phone;
        const visible = cleaned.slice(-4);
        return `***-***-${visible}`;
    }
};

// ============================================================
//  NUMBER UTILITIES
// ============================================================
const Numbers = {
    /**
     * Format currency
     */
    currency: (amount, symbol = SHARED_CONFIG.currencySymbol) => {
        if (amount === null || amount === undefined) return `${symbol}0.00`;
        return `${symbol}${Number(amount).toFixed(2)}`;
    },

    /**
     * Format number with commas
     */
    format: (num) => {
        if (num === null || num === undefined) return '0';
        return Number(num).toLocaleString();
    },

    /**
     * Format percentage
     */
    percent: (num, decimals = 0) => {
        if (num === null || num === undefined) return '0%';
        return `${Number(num).toFixed(decimals)}%`;
    },

    /**
     * Clamp number between min and max
     */
    clamp: (num, min, max) => {
        return Math.min(Math.max(num, min), max);
    },

    /**
     * Random number between min and max
     */
    random: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Random float between min and max
     */
    randomFloat: (min, max, decimals = 2) => {
        return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
    }
};

// ============================================================
//  VALIDATION UTILITIES
// ============================================================
const Validators = {
    /**
     * Validate email
     */
    email: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Validate phone
     */
    phone: (phone) => {
        const re = /^[\+\d\s\-()]{10,20}$/;
        return re.test(phone);
    },

    /**
     * Validate URL
     */
    url: (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Validate date
     */
    date: (date) => {
        const d = new Date(date);
        return !isNaN(d.getTime());
    },

    /**
     * Validate required field
     */
    required: (value) => {
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return value !== null && value !== undefined;
    },

    /**
     * Validate min length
     */
    minLength: (value, min) => {
        if (typeof value === 'string') return value.length >= min;
        return false;
    },

    /**
     * Validate max length
     */
    maxLength: (value, max) => {
        if (typeof value === 'string') return value.length <= max;
        return false;
    },

    /**
     * Validate numeric
     */
    numeric: (value) => {
        return !isNaN(parseFloat(value)) && isFinite(value);
    },

    /**
     * Validate integer
     */
    integer: (value) => {
        return Number.isInteger(Number(value));
    }
};

// ============================================================
//  FORM UTILITIES
// ============================================================
const Forms = {
    /**
     * Serialize form data to object
     */
    serialize: (form) => {
        if (typeof form === 'string') {
            form = document.getElementById(form);
        }
        if (!form) return {};
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            if (data[key]) {
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        return data;
    },

    /**
     * Populate form with data
     */
    populate: (form, data) => {
        if (typeof form === 'string') {
            form = document.getElementById(form);
        }
        if (!form) return;
        
        Object.entries(data).forEach(([key, value]) => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = input.value === String(value);
                } else if (input.type === 'select-one') {
                    input.value = value;
                } else {
                    input.value = value;
                }
            }
        });
    },

    /**
     * Reset form
     */
    reset: (form) => {
        if (typeof form === 'string') {
            form = document.getElementById(form);
        }
        if (form) form.reset();
    },

    /**
     * Get form values as FormData
     */
    getFormData: (form) => {
        if (typeof form === 'string') {
            form = document.getElementById(form);
        }
        return new FormData(form);
    },

    /**
     * Validate form
     */
    validate: (form, rules = {}) => {
        if (typeof form === 'string') {
            form = document.getElementById(form);
        }
        if (!form) return { valid: false, errors: {} };

        const data = Forms.serialize(form);
        const errors = {};

        Object.entries(rules).forEach(([field, fieldRules]) => {
            const value = data[field] || '';
            const fieldErrors = [];

            if (fieldRules.required && !Validators.required(value)) {
                fieldErrors.push('This field is required');
            }

            if (fieldRules.email && !Validators.email(value)) {
                fieldErrors.push('Invalid email address');
            }

            if (fieldRules.minLength && !Validators.minLength(value, fieldRules.minLength)) {
                fieldErrors.push(`Minimum ${fieldRules.minLength} characters required`);
            }

            if (fieldRules.maxLength && !Validators.maxLength(value, fieldRules.maxLength)) {
                fieldErrors.push(`Maximum ${fieldRules.maxLength} characters allowed`);
            }

            if (fieldRules.numeric && !Validators.numeric(value)) {
                fieldErrors.push('Must be a number');
            }

            if (fieldErrors.length > 0) {
                errors[field] = fieldErrors;
            }
        });

        return {
            valid: Object.keys(errors).length === 0,
            errors,
            data
        };
    }
};

// ============================================================
//  EXPORT
// ============================================================
const Shared = {
    DOM,
    Toast: new ToastSystem(),
    Modal: new ModalSystem(),
    Loading: new LoadingSpinner(),
    DateTime,
    Strings,
    Numbers,
    Validators,
    Forms,
    config: SHARED_CONFIG
};

// Global access
window.HRMS = window.HRMS || {};
window.HRMS.Shared = Shared;

console.log('🧩 HRMS Shared Components loaded successfully!');

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Shared;
}