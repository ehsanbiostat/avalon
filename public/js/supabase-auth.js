// Supabase Authentication System
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';
import { supabaseConfig } from '../supabase-config.js';

class SupabaseAuthSystem {
    constructor() {
        console.log('=== SUPABASE AUTH SYSTEM CONSTRUCTOR ===');
        console.log('Supabase URL:', supabaseConfig.url);
        console.log('Supabase anon key:', supabaseConfig.anonKey.substring(0, 20) + '...');
        this.supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
        this.currentUser = null;
        this.isLoggedIn = false;
        this.isRegistering = false;
        console.log('Supabase client created:', this.supabase);

        this.initializeAuth();
    }

    async initializeAuth() {
        console.log('=== INITIALIZING AUTH ===');
        // Check for existing session
        const { data: { session } } = await this.supabase.auth.getSession();
        console.log('Existing session:', session);

        if (session) {
            console.log('Found existing session, user:', session.user);
            this.currentUser = session.user;
            this.isLoggedIn = true;
            await this.loadUserProfile();
            this.updateUI();
        } else {
            console.log('No existing session found');
        }

        // Listen for auth changes
        console.log('Setting up auth state change listener...');
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('=== AUTH STATE CHANGE ===');
            console.log('Event:', event);
            console.log('Session:', session);

            if (event === 'SIGNED_IN' && session) {
                console.log('User signed in:', session.user);
                this.currentUser = session.user;
                this.isLoggedIn = true;

                // Try to load existing profile, create if doesn't exist
                const profileExists = await this.loadUserProfile();
                if (!profileExists) {
                    console.log('No profile found, creating new profile...');
                    await this.createUserProfile();
                }

                this.updateUI();
                this.showNotification('Successfully logged in!', 'success');
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out');
                this.currentUser = null;
                this.isLoggedIn = false;
                this.updateUI();
                this.showNotification('Logged out successfully', 'info');
            }
        });

        // Set up form event listeners
        // Add a small delay to ensure DOM is fully ready
        setTimeout(() => {
            this.setupAuthForms();
        }, 100);
    }

    setupAuthForms() {
        console.log('=== SETTING UP AUTH FORMS ===');
        // Get form elements
        const authForm = document.getElementById('authForm');
        const authToggleLink = document.getElementById('authToggleLink');
        const authSubmitBtn = document.getElementById('authSubmitBtn');
        const emailGroup = document.getElementById('emailGroup');
        const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');

        console.log('Form elements found:', {
            authForm: !!authForm,
            authToggleLink: !!authToggleLink,
            authSubmitBtn: !!authSubmitBtn,
            emailGroup: !!emailGroup,
            confirmPasswordGroup: !!confirmPasswordGroup
        });

        if (authForm) {
            console.log('Adding submit event listener to authForm');
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Auth form submitted!');
                this.handleAuthSubmit();
            });
        } else {
            console.error('authForm not found!');
        }

        if (authToggleLink) {
            console.log('Adding click event listener to authToggleLink');
            authToggleLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Auth toggle link clicked!');
                this.toggleAuthMode();
            });
        } else {
            console.error('authToggleLink not found!');
        }

        // Close button
        const closeBtn = document.querySelector('#authModal .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModals();
            });
        }

        // Login button
        const authBtn = document.getElementById('authBtn');
        if (authBtn) {
            console.log('Adding click event listener to authBtn');
            authBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Auth button clicked!');
                this.toggleAuthModal();
            });
        } else {
            console.error('authBtn not found!');
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
        console.log('=== AUTH FORM SUBMITTED ===');
        console.log('Is registering:', this.isRegistering);

        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        console.log('Form data:', { email, passwordLength: password?.length, confirmPasswordLength: confirmPassword?.length });

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
            console.log('Calling register function...');
            await this.register(email, password, email.split('@')[0]);
        } else {
            console.log('Calling login function...');
            await this.login(email, password);
        }
    }

    async loadUserProfile() {
        if (!this.currentUser) return false;

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
                // Profile doesn't exist
                console.log('Profile not found');
                return false;
            } else if (error) {
                console.error('Error loading profile:', error);
                console.error('Error details:', error.message, error.details, error.hint);
                return false;
            } else {
                console.log('Profile loaded successfully:', profile);
                this.currentUser.profile = profile;
                return true;
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            return false;
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
        console.log('=== REGISTER FUNCTION CALLED ===');
        console.log('Email:', email);
        console.log('Password length:', password.length);
        console.log('Full name:', fullName);

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

            console.log('Sign up result:', { data, error });

            if (error) {
                console.error('Registration error:', error);
                this.showNotification(error.message, 'error');
                return false;
            }

            if (data.user && !data.user.email_confirmed_at) {
                console.log('User created but email not confirmed');
                this.showNotification('Please check your email to confirm your account.', 'info');
            } else {
                console.log('User created and confirmed:', data.user);
            }

            return true;
        } catch (error) {
            console.error('Registration exception:', error);
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
        console.log('=== TOGGLE AUTH MODAL CALLED ===');
        const modal = document.getElementById('authModal');
        console.log('Modal element:', modal);
        console.log('Current modal display:', modal?.style.display);
        
        if (modal) {
            if (modal.style.display === 'none' || modal.style.display === '') {
                console.log('Opening auth modal');
                modal.style.display = 'block';
                // Reset form to login mode when opening
                this.isRegistering = false;
                this.updateAuthForm();
            } else {
                console.log('Closing auth modal');
                modal.style.display = 'none';
            }
        } else {
            console.error('Auth modal not found!');
        }
    }
}

// Initialize the auth system
console.log('=== INITIALIZING SUPABASE AUTH SYSTEM ===');
const supabaseAuthSystem = new SupabaseAuthSystem();

// Make it globally available
window.supabaseAuthSystem = supabaseAuthSystem;
console.log('Supabase auth system initialized and available globally');

// Export both as default and named export
export default supabaseAuthSystem;
export { supabaseAuthSystem };
