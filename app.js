/**
 * Offline AI Assistant - Main Application
 * Production-ready, WebGPU/WASM powered, PWA optimized
 * Version: 3.0.0
 */

import * as webllm from 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.38/+esm';

class OfflineAIAssistant {
    constructor() {
        this.engine = null;
        this.isGenerating = false;
        this.abortController = null;
        this.chatHistory = [];
        this.settings = {
            temperature: 0.7,
            maxTokens: 1024,
            systemPrompt: 'You are a helpful AI assistant running entirely offline. Provide concise, accurate responses.',
            useGPU: true
        };
        
        this.init();
    }

    async init() {
        try {
            // Initialize UI elements
            this.initElements();
            
            // Check WebGPU/WebGL support
            await this.checkDeviceCapabilities();
            
            // Initialize MLC engine
            await this.initMLC();
            
            // Load settings from localStorage
            this.loadSettings();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Check PWA installation
            this.checkPWAInstall();
            
            // Hide loading overlay
            setTimeout(() => {
                this.hideLoadingOverlay();
            }, 1000);
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Error', 'Failed to initialize AI engine. Please refresh.', 'error');
            this.hideLoadingOverlay();
        }
    }

    initElements() {
        // Core UI elements
        this.elements = {
            chatBox: document.getElementById('chat-box'),
            userInput: document.getElementById('user-input'),
            sendBtn: document.getElementById('send-btn'),
            loadBtn: document.getElementById('load-btn'),
            modelSelect: document.getElementById('model-select'),
            status: document.getElementById('status'),
            progressBar: document.getElementById('progress-bar'),
            progressText: document.getElementById('progress-text'),
            progressContainer: document.getElementById('progress-container'),
            progressDetails: document.getElementById('progress-details'),
            modelBadge: document.getElementById('model-badge'),
            modelStats: document.getElementById('model-stats'),
            modelSize: document.getElementById('model-size'),
            connectionStatus: document.getElementById('connection-status'),
            gpuStatus: document.getElementById('gpu-status'),
            deviceStatus: document.getElementById('device-status'),
            typingIndicator: document.getElementById('typing-indicator'),
            suggestions: document.getElementById('suggestions'),
            charCounter: document.getElementById('char-counter'),
            charCount: document.getElementById('char-count'),
            stopBtn: document.getElementById('stop-btn'),
            clearBtn: document.getElementById('clear-btn'),
            sendIcon: document.getElementById('send-icon'),
            stopIcon: document.getElementById('stop-icon'),
            loadingOverlay: document.getElementById('loading-overlay'),
            toast: document.getElementById('toast'),
            temperature: document.getElementById('temperature'),
            tempValue: document.getElementById('temp-value'),
            maxTokens: document.getElementById('max-tokens'),
            tokensValue: document.getElementById('tokens-value'),
            advancedOptions: document.getElementById('advanced-options'),
            advancedToggle: document.getElementById('advanced-toggle'),
            installPrompt: document.getElementById('install-prompt'),
            installAccept: document.getElementById('install-accept'),
            installDismiss: document.getElementById('install-dismiss')
        };
    }

    async checkDeviceCapabilities() {
        try {
            let gpuAvailable = false;
            let webgl2Available = false;
            
            // Check WebGPU
            if (navigator.gpu) {
                try {
                    const adapter = await navigator.gpu.requestAdapter();
                    gpuAvailable = !!adapter;
                    this.elements.gpuStatus.textContent = `GPU: ${adapter ? 'Available' : 'Unavailable'}`;
                } catch (error) {
                    console.warn('WebGPU not available:', error);
                }
            }
            
            // Check WebGL2 as fallback
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2');
            webgl2Available = !!gl;
            
            if (!gpuAvailable && !webgl2Available) {
                this.showToast('Warning', 'Hardware acceleration not available. Performance may be limited.', 'warning');
                this.elements.gpuStatus.textContent = 'GPU: Software rendering';
            }
            
            // Update device status
            this.elements.deviceStatus.textContent = 
                `WebGPU: ${gpuAvailable ? '✅' : '❌'} | WebGL2: ${webgl2Available ? '✅' : '❌'}`;
                
        } catch (error) {
            console.error('Device capability check failed:', error);
        }
    }

    async initMLC() {
        try {
            // Configure MLC
            const config = {
                appConfig: {
                    model_list: [
                        {
                            "model_url": "https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC/resolve/main/",
                            "model_id": "Llama-3.2-1B-Instruct-q4f16_1-MLC",
                            "model_lib_url": "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/Llama-3.2-1B-Instruct-q4f16_1-MLC-webgpu.wasm"
                        },
                        {
                            "model_url": "https://huggingface.co/mlc-ai/SmolLM2-135M-Instruct-q4f16_1-MLC/resolve/main/",
                            "model_id": "SmolLM2-135M-Instruct-q4f16_1-MLC",
                            "model_lib_url": "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/SmolLM2-135M-Instruct-q4f16_1-MLC-webgpu.wasm"
                        },
                        {
                            "model_url": "https://huggingface.co/mlc-ai/gemma-2b-it-q4f16_1-MLC/resolve/main/",
                            "model_id": "gemma-2b-it-q4f16_1-MLC",
                            "model_lib_url": "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/gemma-2b-it-q4f16_1-MLC-webgpu.wasm"
                        }
                    ]
                }
            };
            
            // Initialize engine
            this.engine = await webllm.CreateMLCEngine("", {
                initProgressCallback: this.handleInitProgress.bind(this),
                appConfig: config.appConfig
            });
            
            console.log('MLC engine initialized');
            
        } catch (error) {
            console.error('MLC initialization failed:', error);
            throw error;
        }
    }

    handleInitProgress(report) {
        const progress = report.progress;
        const text = report.text;
        
        // Update progress bar
        if (progress > 0) {
            this.elements.progressBar.style.width = `${progress * 100}%`;
            this.elements.progressText.textContent = `${Math.round(progress * 100)}%`;
        }
        
        // Update status text
        this.elements.status.textContent = text;
        this.elements.progressDetails.textContent = text;
        
        // Update initialization progress
        const initProgress = this.elements.initProgress;
        if (initProgress) {
            initProgress.textContent = text;
        }
    }

    setupEventListeners() {
        // Send message
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Load model
        this.elements.loadBtn.addEventListener('click', () => this.loadModel());
        
        // Stop generation
        this.elements.stopBtn.addEventListener('click', () => this.stopGeneration());
        
        // Clear chat
        this.elements.clearBtn.addEventListener('click', () => this.clearChat());
        
        // Input character counter
        this.elements.userInput.addEventListener('input', (e) => {
            const length = e.target.value.length;
            this.elements.charCount.textContent = length;
            this.elements.charCounter.classList.toggle('hidden', length === 0);
            
            // Toggle send button
            this.elements.sendBtn.disabled = length === 0 || this.isGenerating;
        });
        
        // Model selection
        this.elements.modelSelect.addEventListener('change', () => {
            const selected = this.elements.modelSelect.value;
            this.elements.loadBtn.disabled = !selected;
        });
        
        // Settings controls
        this.elements.temperature.addEventListener('input', (e) => {
            this.settings.temperature = parseFloat(e.target.value);
            this.elements.tempValue.textContent = e.target.value;
        });
        
        this.elements.maxTokens.addEventListener('input', (e) => {
            this.settings.maxTokens = parseInt(e.target.value);
            this.elements.tokensValue.textContent = e.target.value;
        });
        
        // Advanced options toggle
        this.elements.advancedToggle.addEventListener('click', () => {
            this.elements.advancedOptions.classList.toggle('hidden');
        });
        
        // Suggestion buttons
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.elements.userInput.value = e.target.textContent;
                this.elements.userInput.dispatchEvent(new Event('input'));
                this.elements.userInput.focus();
            });
        });
        
        // PWA install
        if (this.elements.installAccept) {
            this.elements.installAccept.addEventListener('click', () => this.installPWA());
        }
        
        if (this.elements.installDismiss) {
            this.elements.installDismiss.addEventListener('click', () => {
                this.elements.installPrompt.classList.add('hidden');
                localStorage.setItem('pwa-dismissed', Date.now().toString());
            });
        }
        
        // Save settings on change
        const saveSettings = () => this.saveSettings();
        this.elements.temperature.addEventListener('change', saveSettings);
        this.elements.maxTokens.addEventListener('change', saveSettings);
        
        // Window events
        window.addEventListener('online', () => this.updateConnectionStatus(true));
        window.addEventListener('offline', () => this.updateConnectionStatus(false));
        
        // Service Worker events
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'UPDATE_AVAILABLE') {
                    this.showToast('Update Available', 'New version is available. Refresh to update.', 'info');
                }
            });
        }
    }

    async loadModel() {
        const modelId = this.elements.modelSelect.value;
        if (!modelId) {
            this.showToast('Error', 'Please select a model first.', 'error');
            return;
        }
        
        try {
            // Update UI
            this.elements.loadBtn.disabled = true;
            this.elements.loadText.textContent = 'Loading...';
            this.elements.loadSpinner.classList.remove('hidden');
            this.elements.progressContainer.classList.remove('hidden');
            this.elements.modelBadge.classList.add('hidden');
            
            // Show progress
            this.elements.status.textContent = 'Downloading model...';
            this.elements.progressBar.style.width = '0%';
            this.elements.progressText.textContent = '0%';
            
            // Load the model
            await this.engine.reload(modelId, {
                temperature: this.settings.temperature,
                max_gen_len: this.settings.maxTokens
            });
            
            // Update UI
            this.elements.modelBadge.textContent = 'Ready';
            this.elements.modelBadge.classList.remove('hidden');
            this.elements.modelStats.classList.remove('hidden');
            
            // Update model size
            const sizeMap = {
                '135M': '0.1B',
                '1B': '1B',
                '2B': '2B',
                '3B': '3B'
            };
            
            const size = modelId.match(/(\d+(\.\d+)?[BM])/)?.[0] || 'Unknown';
            this.elements.modelSize.textContent = sizeMap[size] || size;
            
            // Enable chat
            this.elements.sendBtn.disabled = false;
            this.elements.userInput.disabled = false;
            this.elements.userInput.placeholder = 'Ask anything...';
            this.elements.suggestions.classList.remove('hidden');
            
            // Hide progress
            setTimeout(() => {
                this.elements.progressContainer.classList.add('hidden');
            }, 1000);
            
            // Update button
            this.elements.loadText.textContent = 'Model Loaded';
            this.elements.loadSpinner.classList.add('hidden');
            
            this.showToast('Success', `Model "${modelId}" loaded successfully!`, 'success');
            
            // Save last used model
            localStorage.setItem('lastModel', modelId);
            
        } catch (error) {
            console.error('Model loading failed:', error);
            this.showToast('Error', `Failed to load model: ${error.message}`, 'error');
            
            // Reset UI
            this.elements.loadBtn.disabled = false;
            this.elements.loadText.textContent = 'Load Model';
            this.elements.loadSpinner.classList.add('hidden');
            this.elements.progressContainer.classList.add('hidden');
        }
    }

    async sendMessage() {
        const text = this.elements.userInput.value.trim();
        if (!text || !this.engine || this.isGenerating) return;
        
        try {
            // Update UI
            this.isGenerating = true;
            this.elements.sendBtn.disabled = true;
            this.elements.userInput.disabled = true;
            this.elements.stopBtn.classList.remove('hidden');
            this.elements.sendIcon.classList.add('hidden');
            this.elements.stopIcon.classList.remove('hidden');
            
            // Add user message to chat
            this.appendMessage('user', text);
            
            // Show typing indicator
            this.elements.typingIndicator.classList.remove('hidden');
            
            // Prepare messages
            const messages = [
                ...this.chatHistory.slice(-10), // Keep last 10 messages for context
                { role: 'user', content: text }
            ];
            
            // Create abort controller for cancellation
            this.abortController = new AbortController();
            
            // Generate response
            const completion = await this.engine.chat.completions.create({
                messages: messages,
                stream: true,
                temperature: this.settings.temperature,
                max_tokens: this.settings.maxTokens
            }, { signal: this.abortController.signal });
            
            // Add AI message placeholder
            const aiMessageDiv = this.appendMessage('ai', '');
            let fullResponse = '';
            
            // Stream response
            for await (const chunk of completion) {
                if (this.abortController.signal.aborted) break;
                
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullResponse += content;
                    
                    // Update message with typing effect
                    this.updateMessage(aiMessageDiv, fullResponse);
                    
                    // Auto-scroll
                    aiMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
            
            // Add to chat history
            this.chatHistory.push(
                { role: 'user', content: text },
                { role: 'assistant', content: fullResponse }
            );
            
            // Save chat history (limited to last 50 messages)
            if (this.chatHistory.length > 50) {
                this.chatHistory = this.chatHistory.slice(-50);
            }
            localStorage.setItem('chatHistory', JSON.stringify(this.chatHistory));
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Generation stopped by user');
            } else {
                console.error('Generation failed:', error);
                this.appendMessage('system', `Error: ${error.message}`);
                this.showToast('Error', 'Failed to generate response', 'error');
            }
        } finally {
            // Reset UI
            this.isGenerating = false;
            this.elements.sendBtn.disabled = false;
            this.elements.userInput.disabled = false;
            this.elements.userInput.focus();
            this.elements.stopBtn.classList.add('hidden');
            this.elements.sendIcon.classList.remove('hidden');
            this.elements.stopIcon.classList.add('hidden');
            this.elements.typingIndicator.classList.add('hidden');
            this.abortController = null;
        }
    }

    stopGeneration() {
        if (this.abortController && !this.abortController.signal.aborted) {
            this.abortController.abort();
            this.showToast('Info', 'Generation stopped', 'info');
        }
    }

    appendMessage(role, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-enter ${role === 'user' ? 'user-message' : 'ai-message'}`;
        
        const isUser = role === 'user';
        const bgColor = isUser ? 'bg-blue-900/20' : 'bg-gray-800/30';
        const borderColor = isUser ? 'border-blue-700/30' : 'border-gray-700/30';
        const textColor = isUser ? 'text-blue-300' : 'text-gray-200';
        
        messageDiv.innerHTML = `
            <div class="${bgColor} ${borderColor} border rounded-xl p-4 max-w-[85%] ${isUser ? 'ml-auto' : 'mr-auto'}">
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full ${isUser ? 'bg-blue-600' : 'bg-purple-600'} flex items-center justify-center flex-shrink-0">
                        ${isUser ? '👤' : '🤖'}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-sm mb-1 ${textColor}">
                            ${isUser ? 'You' : 'AI Assistant'}
                        </div>
                        <div class="prose prose-invert max-w-none message-content">
                            ${this.formatMessage(text)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.elements.chatBox.appendChild(messageDiv);
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
        
        // Store reference to content div
        messageDiv.contentDiv = messageDiv.querySelector('.message-content');
        
        return messageDiv;
    }

    updateMessage(messageDiv, text) {
        if (messageDiv.contentDiv) {
            messageDiv.contentDiv.innerHTML = this.formatMessage(text);
        }
    }

    formatMessage(text) {
        // Convert markdown-like formatting
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank">$1</a>');
    }

    clearChat() {
        if (this.isGenerating) {
            if (!confirm('Generation in progress. Stop and clear chat?')) return;
            this.stopGeneration();
        }
        
        this.chatHistory = [];
        this.elements.chatBox.innerHTML = `
            <div class="text-center animate-fade-in">
                <div class="inline-block bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl p-6 max-w-lg">
                    <div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-gray-200 mb-2">Chat Cleared</h3>
                    <p class="text-gray-400">Start a new conversation with the AI.</p>
                </div>
            </div>
        `;
        
        localStorage.removeItem('chatHistory');
        this.showToast('Info', 'Chat cleared', 'info');
    }

    showToast(title, message, type = 'info') {
        const toast = this.elements.toast;
        const icon = toast.querySelector('#toast-icon');
        const titleEl = toast.querySelector('#toast-title');
        const messageEl = toast.querySelector('#toast-message');
        
        // Set styles based on type
        const styles = {
            success: 'bg-green-900/90 border-green-700',
            error: 'bg-red-900/90 border-red-700',
            warning: 'bg-yellow-900/90 border-yellow-700',
            info: 'bg-blue-900/90 border-blue-700'
        };
        
        // Set icon
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.className = `fixed bottom-4 right-4 max-w-sm p-4 rounded-lg shadow-lg z-50 border ${styles[type]}`;
        icon.textContent = icons[type];
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        // Show toast
        toast.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 5000);
        
        // Close button
        toast.querySelector('#toast-close').onclick = () => {
            toast.classList.add('hidden');
        };
    }

    hideLoadingOverlay() {
        this.elements.loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            this.elements.loadingOverlay.classList.add('hidden');
        }, 300);
    }

    updateConnectionStatus(isOnline) {
        const status = this.elements.connectionStatus;
        if (isOnline) {
            status.innerHTML = '<span class="w-2 h-2 bg-green-500 rounded-full"></span><span>Online</span>';
            status.className = 'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-900/30 text-green-400';
        } else {
            status.innerHTML = '<span class="w-2 h-2 bg-yellow-500 rounded-full"></span><span>Offline</span>';
            status.className = 'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-900/30 text-yellow-400';
        }
    }

    checkPWAInstall() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install prompt if not dismissed in last 7 days
            const lastDismissed = localStorage.getItem('pwa-dismissed');
            const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            
            if (!lastDismissed || parseInt(lastDismissed) < oneWeekAgo) {
                setTimeout(() => {
                    this.elements.installPrompt.classList.remove('hidden');
                }, 3000);
            }
        });
        
        window.addEventListener('appinstalled', () => {
            this.elements.installPrompt.classList.add('hidden');
            this.showToast('Installed', 'Offline AI has been installed!', 'success');
        });
    }

    async installPWA() {
        if (window.deferredPrompt) {
            window.deferredPrompt.prompt();
            const { outcome } = await window.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                this.elements.installPrompt.classList.add('hidden');
            }
            
            window.deferredPrompt = null;
        }
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('ai-settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
                
                // Update UI
                this.elements.temperature.value = this.settings.temperature;
                this.elements.tempValue.textContent = this.settings.temperature;
                this.elements.maxTokens.value = this.settings.maxTokens;
                this.elements.tokensValue.textContent = this.settings.maxTokens;
            }
            
            // Load chat history
            const history = localStorage.getItem('chatHistory');
            if (history) {
                this.chatHistory = JSON.parse(history);
                // Re-render chat history
                this.renderChatHistory();
            }
            
            // Load last used model
            const lastModel = localStorage.getItem('lastModel');
            if (lastModel) {
                this.elements.modelSelect.value = lastModel;
                this.elements.loadBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('ai-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    renderChatHistory() {
        // Clear existing messages (except welcome)
        const welcome = this.elements.chatBox.querySelector('.text-center');
        this.elements.chatBox.innerHTML = '';
        if (welcome) {
            this.elements.chatBox.appendChild(welcome);
        }
        
        // Render history
        this.chatHistory.forEach(msg => {
            if (msg.role !== 'system') {
                this.appendMessage(msg.role === 'user' ? 'user' : 'ai', msg.content);
            }
        });
    }
}

// Initialize the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.aiApp = new OfflineAIAssistant();
    });
} else {
    window.aiApp = new OfflineAIAssistant();
}

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none'
            });
            
            console.log('Service Worker registered:', registration);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Notify user about update
                        if (window.aiApp) {
                            window.aiApp.showToast('Update Available', 'New version available. Refresh to update.', 'info');
                        }
                    }
                });
            });
            
            // Check if page was reloaded due to update
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
            }
            
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    });
}

// Handle offline/online status
window.addEventListener('online', () => {
    document.documentElement.classList.remove('offline');
    if (window.aiApp) {
        window.aiApp.updateConnectionStatus(true);
    }
});

window.addEventListener('offline', () => {
    document.documentElement.classList.add('offline');
    if (window.aiApp) {
        window.aiApp.updateConnectionStatus(false);
    }
});

// Add to Home Screen logic
window.addEventListener('beforeinstallprompt', (e) => {
    window.deferredPrompt = e;
});

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    if (window.aiApp) {
        window.aiApp.showToast(
            'Error',
            event.message || 'An unexpected error occurred',
            'error'
        );
    }
});

// Unhandled promise rejection
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    if (window.aiApp) {
        window.aiApp.showToast(
            'Error',
            event.reason?.message || 'Promise rejection',
            'error'
        );
    }
});
