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
    }

    async loadUserProfile() {
        if (!this.currentUser) return;

        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error && error.code === 'PGRST116') {
                // Profile doesn't exist, create it
                await this.createUserProfile();
            } else if (error) {
                console.error('Error loading profile:', error);
            } else {
                this.currentUser.profile = profile;
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    async createUserProfile() {
        if (!this.currentUser) return;

        const profileData = {
            id: this.currentUser.id,
            username: this.currentUser.email.split('@')[0],
            display_name: this.currentUser.user_metadata?.full_name || this.currentUser.email.split('@')[0],
            avatar: '👤'
        };

        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .insert(profileData)
                .select()
                .single();

            if (error) {
                console.error('Error creating profile:', error);
            } else {
                this.currentUser.profile = data;
            }
        } catch (error) {
            console.error('Error creating user profile:', error);
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

        if (this.isLoggedIn && this.currentUser) {
            if (authSection) authSection.style.display = 'none';
            if (userSection) userSection.style.display = 'block';
            
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
            modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
        }
    }
}

// Initialize the auth system
const supabaseAuthSystem = new SupabaseAuthSystem();

// Make it globally available
window.supabaseAuthSystem = supabaseAuthSystem;

export default supabaseAuthSystem;
