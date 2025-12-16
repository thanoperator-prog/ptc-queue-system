// Features: Admin Login, Touchscreen Kiosk, Real-Time Monitoring, Priority Queue, Operational Efficiency

class QueueSystem {
    constructor() {
        this.currentQueue = this.loadFromDatabase('queueData') || [];
        this.transactionLogs = this.loadFromDatabase('transactionLogs') || [];
        this.activityLog = [];
        this.serviceCounters = {
            'Counter 1': { current: null, service: null },
            'Counter 2': { current: null, service: null },
            'Counter 3': { current: null, service: null }
        };
        this.currentCustomer = null;
        this.selectedService = null;
        this.selectedTransactionType = null;
        this.selectedPriority = 'Regular';
        this.customerInfo = {
            name: '',
            id: '',
            email: '',
            course: '',
            phone: '',
            type: '',
            purpose: ''
        };
        // Login removed for kiosk flow
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startRealtimeUpdates();
        // Sync fee-options visibility on load in case the select already has a value
        const customerTypeEl = document.getElementById('customer-type');
        if (customerTypeEl) this.onCustomerTypeChange(customerTypeEl.value);
    }

    setupLoginListener() {
        // login removed - no-op
    }

    handleLogin(e) {
        // login removed
    }

    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Priority selection
        document.querySelectorAll('.priority-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectPriority(e.currentTarget));
        });

        // Service cards
        document.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('click', () => this.selectService(card));
        });

        // Staff controls
        const callNextBtn = document.getElementById('call-next-btn');
        const completeBtn = document.getElementById('complete-btn');
        const noShowBtn = document.getElementById('no-show-btn');
        
        if (callNextBtn) callNextBtn.addEventListener('click', () => this.callNextCustomer());
        if (completeBtn) completeBtn.addEventListener('click', () => this.completeService());
        if (noShowBtn) noShowBtn.addEventListener('click', () => this.markNoShow());

        // Counter selection
        const counterSelect = document.getElementById('counter-select');
        if (counterSelect) {
            counterSelect.addEventListener('change', (e) => this.selectCounter(e.target.value));
        }

        // Admin controls
        const resetBtn = document.getElementById('reset-queue-btn');
        const exportBtn = document.getElementById('export-logs-btn');
        
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetQueue());
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportLogs());

        // Filters
        const serviceFilter = document.getElementById('service-filter');
        const statusFilter = document.getElementById('status-filter');
        const priorityFilter = document.getElementById('priority-filter');
        
        if (serviceFilter) serviceFilter.addEventListener('change', () => this.updateLogs());
        if (statusFilter) statusFilter.addEventListener('change', () => this.updateLogs());
        if (priorityFilter) priorityFilter.addEventListener('change', () => this.updateLogs());

        // Print ticket
        const printBtn = document.getElementById('print-ticket');
        if (printBtn) printBtn.addEventListener('click', () => this.printTicket());

        // New queue button
        const newQueueBtn = document.getElementById('new-queue-btn');
        if (newQueueBtn) newQueueBtn.addEventListener('click', () => this.resetKioskDisplay());

        // Transaction type buttons (exclude fee-option buttons which have their own handler)
        document.querySelectorAll('.transaction-type-btn:not(.fee-option-btn)').forEach(btn => {
            btn.addEventListener('click', () => this.selectTransactionType(btn));
        });
        // Customer document type change (show fee options when fee payment selected)
        const customerType = document.getElementById('customer-type');
        if (customerType) {
            customerType.addEventListener('change', (e) => this.onCustomerTypeChange(e.target.value));
        }

        // Fee option buttons (inside customer form)
        document.querySelectorAll('.fee-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectFeeOption(e.currentTarget));
        });
    }

    onCustomerTypeChange(value) {
        const feeOptions = document.getElementById('fee-options');
        const selectedPrice = null;
        const purposeEl = document.getElementById('customer-purpose');
        const purposeRow = purposeEl ? purposeEl.closest('.form-row') : null;
        const hiddenFeeInput = document.getElementById('selected-fee-input');

        if (value === 'Fee Payment') {
            if (feeOptions) { feeOptions.classList.remove('hidden'); feeOptions.style.display = 'grid'; }
            // hide purpose field and remove required
            if (purposeRow) purposeRow.style.display = 'none';
            if (purposeEl) purposeEl.required = false;
            // no visible price field — selection stored in hidden input
        } else {
            if (feeOptions) { feeOptions.classList.add('hidden'); feeOptions.style.display = 'none'; }
            document.querySelectorAll('.fee-option-btn').forEach(b => b.classList.remove('active'));
            // show purpose field and make required
            if (purposeRow) purposeRow.style.display = '';
            if (purposeEl) purposeEl.required = true;
            if (hiddenFeeInput) hiddenFeeInput.value = '';
        }
        this.customerInfo.type = value;
    }

    selectFeeOption(btn) {
        document.querySelectorAll('.fee-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const name = btn.dataset.name || btn.textContent.trim();
        const price = btn.dataset.price || '';

        const purposeEl = document.getElementById('customer-purpose');
        if (purposeEl) purposeEl.value = `Payment for ${name}`;

        const hiddenFeeInput = document.getElementById('selected-fee-input');
        if (hiddenFeeInput) hiddenFeeInput.value = name || '';

        this.customerInfo.purpose = purposeEl ? purposeEl.value : '';
        this.customerInfo.fee = name;
        this.customerInfo.price = price;
    }

    logout() {
        // logout removed - no-op
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        document.getElementById(tabName + '-tab').classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        if (tabName === 'display') {
            this.updateDisplayBoard();
        }
    }

    selectPriority(btn) {
        document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedPriority = btn.dataset.priority;
    }

    selectService(card) {
        document.querySelectorAll('.service-card').forEach(c => c.style.borderColor = '#e0e0e0');
        this.selectedService = card.dataset.service;
        card.style.borderColor = '#667eea';
        this.generateQueueNumber();
    }

    // Kiosk Step Navigation
    goToStep(stepName) {
        if (stepName === 'transaction-type') {
            // Validate customer info
            const name = document.getElementById('customer-name').value.trim();
            const id = document.getElementById('customer-id').value.trim();
            const email = document.getElementById('customer-email').value.trim();
            const course = document.getElementById('customer-course').value.trim();
            const custType = document.getElementById('customer-type').value;
            const purposeEl = document.getElementById('customer-purpose');
            const purpose = purposeEl ? purposeEl.value.trim() : '';

            // If document type is Fee Payment, require a fee item selection instead of purpose
            if (custType === 'Fee Payment') {
                const selectedFee = document.querySelector('.fee-option-btn.active');
                if (!name || !id || !email || !course || !custType || !selectedFee) {
                    alert('Please fill in all required fields and select a fee item');
                    return;
                }
                // store selected fee info
                this.customerInfo.name = name;
                this.customerInfo.id = id;
                this.customerInfo.email = email;
                this.customerInfo.course = course;
                this.customerInfo.type = custType;
                this.customerInfo.purpose = selectedFee.dataset.name || selectedFee.textContent.trim();
                this.customerInfo.price = selectedFee.dataset.price || '';
            } else {
                if (!name || !id || !email || !course || !custType || !purpose) {
                    alert('Please fill in all required fields');
                    return;
                }

                this.customerInfo.name = name;
                this.customerInfo.id = id;
                this.customerInfo.email = email;
                this.customerInfo.course = course;
                this.customerInfo.type = custType;
                this.customerInfo.purpose = purpose;
            }
            
            // Generate queue directly
            this.generateDirectQueue();
            return;
        }

        // Hide all steps
        document.querySelectorAll('.kiosk-step').forEach(step => step.classList.remove('active'));
        // Show selected step
        document.getElementById(`step-${stepName}`).classList.add('active');
        // When showing the customer info step ensure fee options UI matches current selection
        if (stepName === 'customer-info') {
            const customerTypeEl = document.getElementById('customer-type');
            if (customerTypeEl) this.onCustomerTypeChange(customerTypeEl.value);
        }
    }

    toggleCategory(header) {
        const category = header.parentElement;
        category.classList.toggle('expanded');
        const items = header.nextElementSibling;
        if (items.style.display === 'none') {
            items.style.display = 'grid';
        } else {
            items.style.display = 'none';
        }
    }

    selectTransactionType(btn) {
        this.selectedTransactionType = btn.dataset.transaction;
        const t = (this.selectedTransactionType || '').toLowerCase();
        if (t.includes('fee') || t.includes('payment')) {
            // For fee-related transactions: normalize fee name and try to get its price
            // e.g. "Tuition Fee Payment" -> "Tuition Fee"
            let feeName = this.selectedTransactionType.replace(/\s*payment$/i, '').trim();
            this.customerInfo.fee = feeName;

            // Try to read price from the clicked button (if present) or from the fee buttons in the form
            let price = btn.dataset.price || '';
            if (!price) {
                const match = document.querySelector(`.fee-option-btn[data-name="${feeName}"]`);
                if (match) price = match.dataset.price || '';
            }
            this.customerInfo.price = price || '';

            // Ensure the customer type field is Fee Payment
            this.customerInfo.type = 'Fee Payment';
            this.generateDirectQueue();
        } else {
            // Non-fee transactions: set type and generate queue
            this.customerInfo.type = this.selectedTransactionType;
            this.generateDirectQueue();
        }
    }

    generateDirectQueue() {
        // Generate queue directly from form without additional steps
        const documentType = (this.customerInfo && this.customerInfo.type) ? this.customerInfo.type : '';

        // Consider it a fee payment if the customer type says so OR if a fee name is present
        const isFeePayment = documentType === 'Fee Payment' || !!(this.customerInfo && this.customerInfo.fee);

        // For fee payment, use F prefix; for documents, use D prefix
        const queuePrefix = isFeePayment ? 'F' : 'D';
        const queueNumber = `${queuePrefix}-${String(this.currentQueue.length + 1).padStart(3, '0')}`;

        // Determine transaction/service and price with robust fallbacks
        let transactionName = '';
        let priceVal = '';

        if (isFeePayment) {
            transactionName = (this.customerInfo && this.customerInfo.fee) ? this.customerInfo.fee : documentType || '';
            priceVal = (this.customerInfo && this.customerInfo.price) ? this.customerInfo.price : '';

            // Fallback: try to find matching fee option button by name and read its data-price
            if (!priceVal && transactionName) {
                try {
                    const selector = `.fee-option-btn[data-name="${transactionName}"]`;
                    const match = document.querySelector(selector);
                    if (match && match.dataset && match.dataset.price) priceVal = match.dataset.price;
                } catch (e) {
                    // ignore selector errors
                }
            }
        } else {
            transactionName = documentType || '';
        }

        const customer = {
            queueNumber: queueNumber,
            customerName: this.customerInfo.name,
            customerId: this.customerInfo.id,
            customerEmail: this.customerInfo.email,
            customerCourse: this.customerInfo.course,
            customerType: this.customerInfo.type,
            customerPurpose: this.customerInfo.purpose,
            transactionType: transactionName || documentType,
            service: transactionName || documentType,
            price: isFeePayment ? (priceVal || '') : '',
            priority: 'Regular',
            timestamp: new Date(),
            status: 'waiting',
            counter: null,
            completedTime: null,
            waitTime: null
        };

        this.currentQueue.push(customer);
        this.currentCustomer = customer;
        this.sortQueueByPriority();
        this.saveToDatabase('queueData', this.currentQueue);
        
        // Display the queue receipt
        document.getElementById('generated-queue').textContent = customer.queueNumber;
        document.getElementById('display-name').textContent = customer.customerName;
        document.getElementById('display-id').textContent = customer.customerId;
        document.getElementById('display-transaction').textContent = customer.transactionType || customer.customerType;
        document.getElementById('display-priority').textContent = isFeePayment ? 'Fee Payment' : 'Regular';
        document.getElementById('display-time').textContent = this.formatTime(customer.timestamp);
        // show price if fee payment
        const priceEl = document.getElementById('display-price');
        if (priceEl) {
            priceEl.textContent = customer.price ? (customer.price === 'Varies' ? 'Varies' : `₱${customer.price}`) : '-';
        }
        
        const waitingCount = this.currentQueue.filter(c => c.status === 'waiting').length;
        document.getElementById('display-position').textContent = waitingCount;
        document.getElementById('display-wait-time').textContent = this.estimateWaitTime(waitingCount) + ' min';

        // Real-time status
        const aheadCount = this.currentQueue.filter(c => 
            c.status === 'waiting' && 
            c.timestamp < customer.timestamp
        ).length;
        if (document.getElementById('ahead-count')) {
            document.getElementById('ahead-count').textContent = aheadCount;
        }
        if (document.getElementById('serving-count')) {
            document.getElementById('serving-count').textContent = this.currentQueue.filter(c => c.status === 'serving').length;
        }
        if (document.getElementById('total-waiting')) {
            document.getElementById('total-waiting').textContent = waitingCount;
        }
        
        this.playSound();
        
        // Show the queue display step directly
        document.querySelectorAll('.kiosk-step').forEach(step => step.classList.remove('active'));
        document.getElementById('step-queue-display').classList.add('active');
        
        this.logActivity(`Queue ${queueNumber} generated for ${customer.transactionType}`);
        this.updateAllDisplays();
    }

    generateFinalQueue() {
        if (!this.selectedTransactionType) {
            alert('Please select a transaction type');
            return;
        }

        this.generateQueueNumber();
        this.goToStep('queue-display');
    }

    generateQueueNumber() {
        if (!this.selectedTransactionType) return;

        const servicePrefix = this.selectedTransactionType.charAt(0);
        const priorityPrefix = this.selectedPriority === 'VIP' ? 'V' : this.selectedPriority === 'Elderly' ? 'E' : '';
        const queueNumber = `${priorityPrefix}${servicePrefix}-${String(this.currentQueue.length + 1).padStart(3, '0')}`;
        
        const customer = {
            queueNumber: queueNumber,
            customerName: this.customerInfo.name,
            customerId: this.customerInfo.id,
            customerType: this.customerInfo.type,
            transactionType: this.selectedTransactionType,
            service: this.selectedTransactionType,
            priority: this.selectedPriority,
            timestamp: new Date(),
            status: 'waiting',
            counter: null,
            completedTime: null,
            waitTime: null
        };

        this.currentQueue.push(customer);
        this.currentCustomer = customer;
        this.sortQueueByPriority();
        this.saveToDatabase('queueData', this.currentQueue);
        this.displayQueueNumber(customer);
        this.logActivity(`Queue ${queueNumber} generated for ${this.selectedTransactionType} (${this.selectedPriority})`);
        this.updateAllDisplays();
    }

    sortQueueByPriority() {
        const priorityOrder = { 'VIP': 0, 'Elderly': 1, 'Regular': 2 };
        this.currentQueue.sort((a, b) => {
            if (a.status === 'waiting' && b.status === 'waiting') {
                return priorityOrder[a.priority] - priorityOrder[b.priority] || 
                       a.timestamp - b.timestamp;
            }
            return 0;
        });
    }

    displayQueueNumber(customer) {
        document.getElementById('generated-queue').textContent = customer.queueNumber;
        document.getElementById('display-name').textContent = customer.customerName;
        document.getElementById('display-id').textContent = customer.customerId;
        // If this is a fee payment generated from the fee selection, show fee name and price
        if (this.customerInfo && this.customerInfo.fee) {
            document.getElementById('display-transaction').textContent = this.customerInfo.fee;
            const priceEl = document.getElementById('display-price');
            const priceVal = this.customerInfo.price || '';
            if (priceEl) priceEl.textContent = priceVal ? (priceVal === 'Varies' ? 'Varies' : `₱${priceVal}`) : '-';
            document.getElementById('display-priority').textContent = 'Fee Payment';
        } else {
            document.getElementById('display-transaction').textContent = customer.transactionType;
            const priceEl = document.getElementById('display-price');
            if (priceEl) priceEl.textContent = '-';
            document.getElementById('display-priority').textContent = customer.priority;
        }
        document.getElementById('display-time').textContent = this.formatTime(customer.timestamp);
        
        const waitingCount = this.currentQueue.filter(c => c.status === 'waiting').length;
        document.getElementById('display-position').textContent = waitingCount;
        document.getElementById('display-wait-time').textContent = this.estimateWaitTime(waitingCount) + ' min';

        // Real-time status
        const aheadCount = this.currentQueue.filter(c => 
            c.status === 'waiting' && 
            c.timestamp < customer.timestamp
        ).length;
        document.getElementById('ahead-count').textContent = aheadCount;
        document.getElementById('serving-count').textContent = this.currentQueue.filter(c => c.status === 'serving').length;
        document.getElementById('total-waiting').textContent = waitingCount;
        
        this.playSound();
    }

    estimateWaitTime(position) {
        return Math.max(0, (position - 1) * 5);
    }

    resetKioskDisplay() {
        // Reset form
        document.getElementById('customer-form').reset();
        this.customerInfo = { name: '', id: '', email: '', course: '', phone: '', type: '', purpose: '', fee: '', price: '' };
        this.selectedTransactionType = null;
        this.selectedPriority = 'Regular';
        this.selectedService = null;
        // hide fee options and clear selected fee
        const feeOptions = document.getElementById('fee-options');
        const hiddenFeeInput = document.getElementById('selected-fee-input');
        if (feeOptions) feeOptions.style.display = 'none';
        if (hiddenFeeInput) hiddenFeeInput.value = '';
        document.querySelectorAll('.fee-option-btn').forEach(b => b.classList.remove('active'));
        
        // Go back to step 1 - use direct method to avoid conflicts
        document.querySelectorAll('.kiosk-step').forEach(step => step.classList.remove('active'));
        document.getElementById('step-customer-info').classList.add('active');
    }

    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        // Show selected tab
        document.getElementById(tabName + '-tab').classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        if (tabName === 'display') {
            this.updateDisplayBoard();
        }
    }

    selectService(card) {
        // Remove previous selection
        document.querySelectorAll('.service-card').forEach(c => c.style.borderColor = '#e0e0e0');
        
        this.selectedService = card.dataset.service;
        card.style.borderColor = '#667eea';

        // Generate queue number
        this.generateQueueNumber();
    }

    generateQueueNumber() {
        if (!this.selectedService) return;

        const servicePrefix = this.selectedService.charAt(0);
        const priorityPrefix = this.selectedPriority === 'VIP' ? 'V' : this.selectedPriority === 'Elderly' ? 'E' : '';
        const queueNumber = `${priorityPrefix}${servicePrefix}-${String(this.currentQueue.length + 1).padStart(3, '0')}`;
        
        const customer = {
            queueNumber: queueNumber,
            service: this.selectedService,
            priority: this.selectedPriority,
            timestamp: new Date(),
            status: 'waiting',
            counter: null,
            completedTime: null,
            waitTime: null
        };

        this.currentQueue.push(customer);
        this.currentCustomer = customer;
        this.sortQueueByPriority();
        this.saveToDatabase('queueData', this.currentQueue);

        // Display queue number
        this.displayQueueNumber(customer);
        this.updateAllDisplays();
    }

    sortQueueByPriority() {
        const priorityOrder = { 'VIP': 0, 'Elderly': 1, 'Regular': 2 };
        this.currentQueue.sort((a, b) => {
            if (a.status === 'waiting' && b.status === 'waiting') {
                return priorityOrder[a.priority] - priorityOrder[b.priority] || 
                       a.timestamp - b.timestamp;
            }
            return 0;
        });
    }

    displayQueueNumber(customer) {
        document.getElementById('generated-queue').textContent = customer.queueNumber;
        document.getElementById('service-type').textContent = customer.service;
        document.getElementById('priority-type').textContent = customer.priority;
        document.getElementById('queue-time').textContent = this.formatTime(customer.timestamp);
        document.getElementById('queue-status').textContent = 'Waiting';
        document.getElementById('queue-status').className = 'status-waiting';
        document.getElementById('queue-display').classList.remove('hidden');

        // Auto-play sound effect
        this.playSound();
    }

    formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    callNextCustomer() {
        const counter = document.getElementById('counter-select').value;
        const nextCustomer = this.currentQueue.find(c => c.status === 'waiting');

        if (!nextCustomer) {
            alert('No customers waiting');
            return;
        }

        nextCustomer.status = 'serving';
        nextCustomer.counter = counter;
        this.serviceCounters[counter].current = nextCustomer.queueNumber;
        this.serviceCounters[counter].service = nextCustomer.service;

        this.saveToDatabase('queueData', this.currentQueue);
        this.logActivity(`${nextCustomer.queueNumber} called at ${counter} for ${nextCustomer.service}`);
        this.updateAllDisplays();
        this.playNotificationSound();
    }

    completeService() {
        const counter = document.getElementById('counter-select').value;
        const serving = this.currentQueue.find(c => c.counter === counter && c.status === 'serving');

        if (!serving) {
            alert('No customer being served at this counter');
            return;
        }

        serving.status = 'completed';
        serving.completedTime = new Date();
        serving.waitTime = Math.floor((serving.completedTime - serving.timestamp) / 1000 / 60); // in minutes
        
        // Add to transaction logs
        this.transactionLogs.push({
            queueNumber: serving.queueNumber,
            service: serving.service,
            priority: serving.priority,
            startTime: this.formatTime(serving.timestamp),
            endTime: this.formatTime(serving.completedTime),
            duration: this.calculateDuration(serving.timestamp, serving.completedTime),
            waitTime: serving.waitTime,
            counter: counter,
            status: 'completed'
        });

        this.serviceCounters[counter].current = null;
        this.serviceCounters[counter].service = null;

        this.saveToDatabase('queueData', this.currentQueue);
        this.saveToDatabase('transactionLogs', this.transactionLogs);
        this.updateAllDisplays();
    }

    markNoShow() {
        const counter = document.getElementById('counter-select').value;
        const serving = this.currentQueue.find(c => c.counter === counter && c.status === 'serving');

        if (!serving) {
            alert('No customer being served at this counter');
            return;
        }

        serving.status = 'no-show';
        serving.completedTime = new Date();
        serving.waitTime = Math.floor((serving.completedTime - serving.timestamp) / 1000 / 60);

        // Add to transaction logs
        this.transactionLogs.push({
            queueNumber: serving.queueNumber,
            service: serving.service,
            priority: serving.priority,
            startTime: this.formatTime(serving.timestamp),
            endTime: this.formatTime(serving.completedTime),
            duration: this.calculateDuration(serving.timestamp, serving.completedTime),
            waitTime: serving.waitTime,
            counter: counter,
            status: 'no-show'
        });

        this.serviceCounters[counter].current = null;
        this.serviceCounters[counter].service = null;

        this.saveToDatabase('queueData', this.currentQueue);
        this.saveToDatabase('transactionLogs', this.transactionLogs);
        this.updateAllDisplays();
    }

    calculateDuration(startTime, endTime) {
        const diff = endTime - startTime;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    selectCounter(counter) {
        this.updateStaffDisplay();
    }

    updateAllDisplays() {
        this.updateStaffDisplay();
        this.updateDisplayBoard();
        this.updateAdminDashboard();
    }

    updateStaffDisplay() {
        const counter = document.getElementById('counter-select').value;
        const counterData = this.serviceCounters[counter];

        document.getElementById('current-queue-display').textContent = counterData.current || '-';
        document.getElementById('current-service-display').textContent = counterData.service || '-';

        this.updateWaitingQueueList();
    }

    updateWaitingQueueList() {
        const counter = document.getElementById('counter-select').value;
        const waitingQueue = this.currentQueue.filter(c => c.status === 'waiting');
        const listContainer = document.getElementById('waiting-queue-list');

        if (waitingQueue.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">No customers waiting</div>';
            return;
        }

        listContainer.innerHTML = waitingQueue.map(customer => `
            <div class="queue-item">
                <div class="queue-item-number">${customer.queueNumber}</div>
                <div class="queue-item-service">${customer.service}</div>
            </div>
        `).join('');
    }

    updateDisplayBoard() {
        // Update time and date - Philippines Timezone (UTC+8)
        const now = new Date();
        const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        const timeEl = document.getElementById('board-time');
        const dateEl = document.getElementById('board-date');
        
        if (timeEl) {
            const hours = String(phTime.getHours()).padStart(2, '0');
            const minutes = String(phTime.getMinutes()).padStart(2, '0');
            const ampm = phTime.getHours() >= 12 ? 'PM' : 'AM';
            const displayHours = phTime.getHours() % 12 || 12;
            timeEl.textContent = `${String(displayHours).padStart(2, '0')}:${minutes} ${ampm}`;
        }
        
        if (dateEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = phTime.toLocaleDateString('en-US', options);
        }

        // Find the first serving customer (status === 'serving')
        const servingCustomer = this.currentQueue.find(c => c.status === 'serving');
        const nowServingQueue = document.getElementById('now-serving-queue');
        const nowServingName = document.getElementById('now-serving-name');
        const nowServingService = document.getElementById('now-serving-service');
        
        if (servingCustomer && nowServingQueue && nowServingName && nowServingService) {
            nowServingQueue.textContent = servingCustomer.queueNumber;
            nowServingName.textContent = servingCustomer.customerName || '-';
            nowServingService.textContent = servingCustomer.transactionType || servingCustomer.service || '-';
        } else {
            if (nowServingQueue) nowServingQueue.textContent = '-';
            if (nowServingName) nowServingName.textContent = '-';
            if (nowServingService) nowServingService.textContent = '-';
        }

        // Update next queue display
        const waiting = this.currentQueue.filter(c => c.status === 'waiting').slice(0, 5);
        const nextQueueDisplay = document.getElementById('next-queue-display-new');

        if (!nextQueueDisplay) return;

        if (waiting.length === 0) {
            nextQueueDisplay.innerHTML = '<div class="empty-state">No queue</div>';
        } else {
            nextQueueDisplay.innerHTML = waiting.map((customer, index) => {
                const waitTime = this.estimateWaitTime(index + 1);
                return `
                    <div class="next-item-new">
                        <div class="next-item-number">${index + 1}</div>
                        <div class="next-item-details">
                            <div class="next-item-queue">${customer.queueNumber}</div>
                            <div class="next-item-service">${customer.transactionType || customer.service || '-'}</div>
                        </div>
                        <div class="next-item-wait">
                            Est. wait<br>
                            <span class="next-item-wait-value">${waitTime}m</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    updateAdminDashboard() {
        const total = this.currentQueue.length;
        const waiting = this.currentQueue.filter(c => c.status === 'waiting').length;
        const completed = this.currentQueue.filter(c => c.status === 'completed').length;
        const noShow = this.currentQueue.filter(c => c.status === 'no-show').length;

        document.getElementById('total-customers').textContent = total;
        document.getElementById('waiting-count').textContent = waiting;
        document.getElementById('completed-count').textContent = completed;
        document.getElementById('no-show-count').textContent = noShow;

        // Calculate operational efficiency metrics
        this.calculateOperationalEfficiency();
        this.updateLogs();
    }

    calculateOperationalEfficiency() {
        if (this.transactionLogs.length === 0) {
            document.getElementById('avg-wait-time-metric').textContent = '0m';
            document.getElementById('avg-service-duration').textContent = '0m';
            document.getElementById('accuracy-rate').textContent = '100%';
            document.getElementById('queue-organization').textContent = 'Good';
            return;
        }

        // Average Wait Time
        const avgWaitTime = Math.round(
            this.transactionLogs.reduce((sum, log) => sum + (log.waitTime || 0), 0) / this.transactionLogs.length
        );
        document.getElementById('avg-wait-time-metric').textContent = avgWaitTime + 'm';
        
        // Trend indicator
        const waitTrend = avgWaitTime > 10 ? '⬆ High' : avgWaitTime > 5 ? '→ Moderate' : '⬇ Low';
        document.getElementById('wait-time-trend').textContent = waitTrend;

        // Average Service Duration
        const avgServiceTime = Math.round(
            this.transactionLogs.reduce((sum, log) => {
                const parts = log.duration.split(' ');
                const minutes = parseInt(parts[0]) || 0;
                return sum + minutes;
            }, 0) / this.transactionLogs.length
        );
        document.getElementById('avg-service-duration').textContent = avgServiceTime + 'm';
        
        const serviceTrend = avgServiceTime > 15 ? '⬆ Slow' : avgServiceTime > 8 ? '→ Normal' : '⬇ Fast';
        document.getElementById('service-trend').textContent = serviceTrend;

        // Transaction Accuracy (Completed / Total)
        const completedCount = this.transactionLogs.filter(log => log.status === 'completed').length;
        const accuracyRate = Math.round((completedCount / this.transactionLogs.length) * 100);
        document.getElementById('accuracy-rate').textContent = accuracyRate + '%';

        // Queue Organization (based on priority adherence)
        const vipCount = this.transactionLogs.filter(log => log.priority === 'VIP').length;
        const elderlyCount = this.transactionLogs.filter(log => log.priority === 'Elderly').length;
        const priorityRatio = (vipCount + elderlyCount) / this.transactionLogs.length;
        
        let organization = 'Excellent';
        let orgTrend = '✓ Optimal';
        if (priorityRatio < 0.2) {
            organization = 'Good';
            orgTrend = '→ Normal';
        }
        if (priorityRatio < 0.1) {
            organization = 'Fair';
            orgTrend = '⬇ Declining';
        }
        
        document.getElementById('queue-organization').textContent = organization;
        document.getElementById('organization-trend').textContent = orgTrend;
    }

    updateLogs() {
        const serviceFilter = document.getElementById('service-filter').value;
        const statusFilter = document.getElementById('status-filter').value;
        const priorityFilter = document.getElementById('priority-filter').value;

        let filtered = this.transactionLogs;

        if (serviceFilter) {
            filtered = filtered.filter(log => log.service === serviceFilter);
        }

        if (statusFilter) {
            filtered = filtered.filter(log => log.status === statusFilter);
        }

        if (priorityFilter) {
            filtered = filtered.filter(log => log.priority === priorityFilter);
        }

        const logsContainer = document.getElementById('logs-table');

        if (filtered.length === 0) {
            logsContainer.innerHTML = '<div class="empty-state">No transactions found</div>';
            return;
        }

        let html = '<div class="log-row-header"><div>Queue #</div><div>Service</div><div>Priority</div><div>Duration</div><div>Counter</div><div>Status</div></div>';
        
        filtered.forEach(log => {
            const statusClass = log.status === 'completed' ? 'completed' : log.status === 'no-show' ? 'no-show' : 'waiting';
            html += `
                <div class="log-row">
                    <div class="log-cell">${log.queueNumber}</div>
                    <div class="log-cell">${log.service}</div>
                    <div class="log-cell">${log.priority}</div>
                    <div class="log-cell">${log.duration}</div>
                    <div class="log-cell">${log.counter}</div>
                    <div class="log-status ${statusClass}">${log.status.toUpperCase()}</div>
                </div>
            `;
        });

        logsContainer.innerHTML = html;
    }

    resetQueue() {
        if (confirm('Are you sure you want to reset the entire queue? This action cannot be undone.')) {
            this.currentQueue = [];
            this.transactionLogs = [];
            this.serviceCounters = {
                'Counter 1': { current: null, service: null },
                'Counter 2': { current: null, service: null },
                'Counter 3': { current: null, service: null }
            };
            this.saveToDatabase('queueData', this.currentQueue);
            this.saveToDatabase('transactionLogs', this.transactionLogs);
            this.updateAllDisplays();
            alert('Queue has been reset');
        }
    }

    exportLogs() {
        if (this.transactionLogs.length === 0) {
            alert('No transaction logs to export');
            return;
        }

        let csv = 'Queue Number,Service,Priority,Start Time,End Time,Duration,Wait Time (mins),Counter,Status\n';
        
        this.transactionLogs.forEach(log => {
            csv += `${log.queueNumber},${log.service},${log.priority},${log.startTime},${log.endTime},${log.duration},${log.waitTime || 0},${log.counter},${log.status}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `queue-logs-${new Date().getTime()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    printTicket() {
        if (!this.currentCustomer) {
            alert('Please generate a queue number first');
            return;
        }

        const c = this.currentCustomer;
        const ticketContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Queue Ticket</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
                .ticket { 
                    border: 2px dashed #333; 
                    padding: 30px; 
                    width: 400px;
                    text-align: center;
                    margin: 0 auto;
                    background: white;
                }
                .ticket-header { font-size: 20px; font-weight: bold; margin-bottom: 20px; }
                .queue-number { 
                    font-size: 60px; 
                    font-weight: bold; 
                    color: #667eea;
                    margin: 20px 0;
                    border: 3px solid #667eea;
                    padding: 20px;
                    border-radius: 10px;
                }
                .info { margin: 10px 0; font-size: 14px; }
                .info-label { font-weight: bold; }
                .footer { margin-top: 30px; font-size: 12px; color: #666; }
                .divider { border-top: 1px dashed #333; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class="ticket">
                <div class="ticket-header">QUEUE TICKET</div>
                <div class="queue-number">${c.queueNumber}</div>
                <div class="info"><span class="info-label">Name:</span> ${c.customerName}</div>
                <div class="info"><span class="info-label">ID:</span> ${c.customerId}</div>
                <div class="divider"></div>
                <div class="info"><span class="info-label">Transaction:</span> ${c.transactionType}</div>
                <div class="info"><span class="info-label">Price:</span> ${c.price ? (c.price === 'Varies' ? 'Varies' : '₱' + c.price) : '-'}</div>
                <div class="info"><span class="info-label">Category:</span> ${c.priority}</div>
                <div class="info"><span class="info-label">Time:</span> ${this.formatTime(c.timestamp)}</div>
                <div class="divider"></div>
                <div class="footer">
                    <p>Please proceed to the designated counter when your number is displayed.</p>
                    <p>Keep this ticket with you during your transaction.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(ticketContent);
        printWindow.document.close();
        printWindow.print();
    }

    startRealtimeUpdates() {
        // Update real-time clock every second
        setInterval(() => {
            const now = new Date();
            const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
            const hours = String(phTime.getHours()).padStart(2, '0');
            const minutes = String(phTime.getMinutes()).padStart(2, '0');
            const seconds = String(phTime.getSeconds()).padStart(2, '0');
            const timeString = `${hours}:${minutes}:${seconds} ${phTime.getHours() >= 12 ? 'PM' : 'AM'}`;
            
            const boardTime = document.getElementById('board-time');
            
            if (boardTime) boardTime.textContent = timeString.replace(/:.*/, () => {
                const h = phTime.getHours() % 12 || 12;
                const m = String(phTime.getMinutes()).padStart(2, '0');
                return `:${m}`;
            });
        }, 1000);
        
    }

    updateRealtimeMonitoring() {
        // Live Monitor was removed; keep as no-op to avoid errors.
        return;
    }

    updateActivityFeed() {
        // Live activity feed removed; no-op.
        return;
    }

    logActivity(message) {
        const now = new Date();
        const time = this.formatTime(now);
        this.activityLog.push({ message, time });
        this.updateActivityFeed();
    }

    playSound() {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    playNotificationSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }

    // Database operations (using localStorage)
    saveToDatabase(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving to database:', e);
        }
    }

    loadFromDatabase(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error loading from database:', e);
            return null;
        }
    }
}

// Initialize the system when DOM is ready
let queueSystem;
document.addEventListener('DOMContentLoaded', () => {
    queueSystem = new QueueSystem();
    
    // Optional: Add some test data
    // Uncomment to add sample transactions
    /*
    queueSystem.currentQueue = [
        { queueNumber: 'A-001', service: 'Admission', timestamp: new Date(), status: 'completed', counter: 'Counter 1', completedTime: new Date() }
    ];
    queueSystem.updateAllDisplays();
    */
});
