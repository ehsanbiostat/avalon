// Supabase Authentication System
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../supabase-config.js';

class SupabaseAuthSystem {
    constructor() {
        this.supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
        this.currentUser = null;
        this.isLoggedIn = false;
        this.isRegistering = false;
        
        this.initializeAuth();
    }

    async initializeAuth() {
        // Check for existing session
        const { data: { session } } = await this.supabase.auth.getSession();
        
        if (session) {
            this.currentUser = session.user;
            this.isLoggedIn = true;
            await this.loadUserProfile();
            this.updateUI();
        }

        // Listen for auth changes
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                this.isLoggedIn = true;
                await this.loadUserProfile();
                this.updateUI();
                this.showNotification('Successfully logged in!', 'success');
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.isLoggedIn = false;
                this.updateUI();
                this.showNotification('Logged out successfully', 'info');
            }
        });

        // Set up form event listeners
        this.setupAuthForms();
    }

    setupAuthForms() {
        // Get form elements
        const authForm = document.getElementById('authForm');
        const authToggleLink = document.getElementById('authToggleLink');
        const authSubmitBtn = document.getElementById('authSubmitBtn');
        const emailGroup = document.getElementById('emailGroup');
        const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');

        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuthSubmit();
            });
        }

        if (authToggleLink) {
            authToggleLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthMode();
            });
        }

        // Close button
        const closeBtn = document.querySelector('#authModal .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModals();
            });
        }

        // Initialize form state
        this.updateAuthForm();
    }

    toggleAuthMode() {
        this.isRegistering = !this.isRegistering;
        this.updateAuthForm();
    }

    updateAuthForm() {
        const authToggleLink = document.getElementById('authToggleLink');
        const authSubmitBtn = document.getElementById('authSubmitBtn');
        const emailGroup = document.getElementById('emailGroup');
        const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
        const passwordLabel = document.querySelector('label[for="password"]');

        if (this.isRegistering) {
            // Register mode
            if (authToggleLink) {
                authToggleLink.textContent = 'Already have an account? Sign in';
            }
            if (authSubmitBtn) {
                authSubmitBtn.textContent = 'Create Account';
            }
            if (emailGroup) {
                emailGroup.style.display = 'block';
            }
            if (confirmPasswordGroup) {
                confirmPasswordGroup.style.display = 'block';
            }
            if (passwordLabel) {
                passwordLabel.textContent = 'Password (min 6 characters)';
            }
        } else {
            // Login mode
            if (authToggleLink) {
                authToggleLink.textContent = 'New to Avalon? Create an account';
            }
            if (authSubmitBtn) {
                authSubmitBtn.textContent = 'Enter Avalon';
            }
            if (emailGroup) {
                emailGroup.style.display = 'block'; // Always show email for login
            }
            if (confirmPasswordGroup) {
                confirmPasswordGroup.style.display = 'none';
            }
            if (passwordLabel) {
                passwordLabel.textContent = 'Password';
            }
        }
    }

    async handleAuthSubmit() {
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        if (!email || !password) {
            this.showNotification('Please fill in all required fields!', 'error');
            return;
        }

        if (this.isRegistering) {
            if (password !== confirmPassword) {
                this.showNotification('Passwords do not match!', 'error');
                return;
            }
            if (password.length < 6) {
                this.showNotification('Password must be at least 6 characters!', 'error');
                return;
            }
            await this.register(email, password, email.split('@')[0]);
        } else {
            await this.login(email, password);
        }
    }

    async loadUserProfile() {
        if (!this.currentUser) return;

        console.log('=== LOADING USER PROFILE ===');
        console.log('User ID:', this.currentUser.id);

        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            console.log('Profile query result:', { profile, error });

            if (error && error.code === 'PGRST116') {
                // Profile doesn't exist, create it
                console.log('Profile not found, creating new profile...');
                await this.createUserProfile();
            } else if (error) {
                console.error('Error loading profile:', error);
                console.error('Error details:', error.message, error.details, error.hint);
            } else {
                console.log('Profile loaded successfully:', profile);
                this.currentUser.profile = profile;
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    async createUserProfile() {
        if (!this.currentUser) {
            console.error('No current user found when trying to create profile');
            return;
        }

        // Validate that we have a proper UUID
        if (!this.currentUser.id || typeof this.currentUser.id !== 'string') {
            console.error('Invalid user ID:', this.currentUser.id);
            this.showNotification('Invalid user ID. Please try logging in again.', 'error');
            return;
        }

        const profileData = {
            id: this.currentUser.id,
            username: this.currentUser.email.split('@')[0],
            display_name: this.currentUser.user_metadata?.full_name || this.currentUser.email.split('@')[0],
            avatar: '👤'
        };

        console.log('=== CREATING USER PROFILE ===');
        console.log('User ID:', this.currentUser.id);
        console.log('User ID type:', typeof this.currentUser.id);
        console.log('Profile data:', profileData);

        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .insert(profileData)
                .select()
                .single();

            if (error) {
                console.error('Error creating profile:', error);
                console.error('Error details:', error.message, error.details, error.hint);
                console.error('Error code:', error.code);
                
                // Handle specific error cases
                if (error.code === '23505') {
                    this.showNotification('Profile already exists for this user.', 'info');
                    // Try to load the existing profile
                    await this.loadUserProfile();
                } else if (error.code === '42501') {
                    this.showNotification('Permission denied. Please check your account status.', 'error');
                } else {
                    this.showNotification('Failed to create user profile: ' + error.message, 'error');
                }
            } else {
                console.log('Profile created successfully:', data);
                this.currentUser.profile = data;
                this.showNotification('Profile created successfully!', 'success');
            }
        } catch (error) {
            console.error('Error creating user profile:', error);
            this.showNotification('Failed to create user profile.', 'error');
        }
    }

    async login(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                this.showNotification(error.message, 'error');
                return false;
            }

            return true;
        } catch (error) {
            this.showNotification('Login failed. Please try again.', 'error');
            return false;
        }
    }

    async register(email, password, fullName) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) {
                this.showNotification(error.message, 'error');
                return false;
            }

            if (data.user && !data.user.email_confirmed_at) {
                this.showNotification('Please check your email to confirm your account.', 'info');
            }

            return true;
        } catch (error) {
            this.showNotification('Registration failed. Please try again.', 'error');
            return false;
        }
    }

    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) {
                this.showNotification('Logout failed.', 'error');
            }
        } catch (error) {
            this.showNotification('Logout failed.', 'error');
        }
    }

    async updateProfile(updates) {
        if (!this.currentUser) return false;

        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .update(updates)
                .eq('id', this.currentUser.id)
                .select()
                .single();

            if (error) {
                this.showNotification('Failed to update profile.', 'error');
                return false;
            }

            this.currentUser.profile = data;
            this.showNotification('Profile updated successfully!', 'success');
            return true;
        } catch (error) {
            this.showNotification('Failed to update profile.', 'error');
            return false;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isUserLoggedIn() {
        return this.isLoggedIn;
    }

    updateUI() {
        const authSection = document.getElementById('authSection');
        const userSection = document.getElementById('userSection');
        const userInfo = document.getElementById('userInfo');
        const authModal = document.getElementById('authModal');

        if (this.isLoggedIn && this.currentUser) {
            if (authSection) authSection.style.display = 'none';
            if (userSection) userSection.style.display = 'block';
            if (authModal) authModal.style.display = 'none';
            
            if (userInfo) {
                const profile = this.currentUser.profile;
                userInfo.innerHTML = `
                    <div class="user-avatar">${profile?.avatar || '👤'}</div>
                    <div class="user-details">
                        <div class="user-name">${profile?.display_name || this.currentUser.email}</div>
                        <div class="user-stats">
                            Games: ${profile?.games_played || 0} | 
                            Wins: ${profile?.games_won || 0} | 
                            Rate: ${profile?.win_rate || 0}%
                        </div>
                    </div>
                `;
            }
        } else {
            if (authSection) authSection.style.display = 'block';
            if (userSection) userSection.style.display = 'none';
            // Don't automatically show auth modal - let user click login button
        }
    }

    showModal(content) {
        const modal = document.getElementById('authModal');
        const modalContent = modal.querySelector('.modal-content');
        
        if (modalContent) {
            modalContent.innerHTML = content;
        }
        
        modal.style.display = 'block';
    }

    closeModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    toggleAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            if (modal.style.display === 'none' || modal.style.display === '') {
                modal.style.display = 'block';
                // Reset form to login mode when opening
                this.isRegistering = false;
                this.updateAuthForm();
            } else {
                modal.style.display = 'none';
            }
        }
    }
}

// Initialize the auth system
const supabaseAuthSystem = new SupabaseAuthSystem();

// Make it globally available
window.supabaseAuthSystem = supabaseAuthSystem;

export default supabaseAuthSystem;
