// Handle viewport height for mobile browsers
export const initMobileViewport = () => {
  // Set initial viewport height
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // Handle keyboard visibility
  const handleKeyboardVisibility = () => {
    if ('visualViewport' in window) {
      const keyboardHeight = window.innerHeight - window.visualViewport.height;
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
      
      if (keyboardHeight > 0) {
        document.body.classList.add('keyboard-visible');
        document.querySelector('.message-input-container')?.classList.add('keyboard-visible');
      } else {
        document.body.classList.remove('keyboard-visible');
        document.querySelector('.message-input-container')?.classList.remove('keyboard-visible');
      }
    }
  };

  // Handle viewport changes
  const handleResize = () => {
    if (!document.body.classList.contains('scrolling')) {
      setVH();
      handleKeyboardVisibility();
    }
  };

  // Handle scroll start/end for iOS
  const handleScrollStart = () => {
    document.body.classList.add('scrolling');
  };

  const handleScrollEnd = () => {
    document.body.classList.remove('scrolling');
    handleKeyboardVisibility();
  };

  // Initial setup
  setVH();
  handleKeyboardVisibility();

  // Add event listeners
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
  document.addEventListener('touchstart', handleScrollStart);
  document.addEventListener('touchend', handleScrollEnd);

  if ('visualViewport' in window) {
    window.visualViewport.addEventListener('resize', handleKeyboardVisibility);
    window.visualViewport.addEventListener('scroll', handleKeyboardVisibility);
  }

  // Initialize mobile menu
  const initMobileMenu = () => {
    let cleanup = null;
    
    // Wait for DOM elements to be available
    setTimeout(() => {
      const menuButton = document.querySelector('.menu-button');
      const sidebar = document.querySelector('.sidebar');
      
      // Only proceed if required elements exist
      if (!menuButton || !sidebar) return;
      
      let overlay = document.querySelector('.sidebar-overlay');

      // Create overlay if it doesn't exist
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
      }

      const toggleMenu = () => {
        // Recheck elements exist when toggling
        const currentButton = document.querySelector('.menu-button');
        const currentSidebar = document.querySelector('.sidebar');
        const currentOverlay = document.querySelector('.sidebar-overlay');
        
        if (!currentButton || !currentSidebar || !currentOverlay) return;
        
        const isOpen = currentSidebar.classList.contains('open');
        currentButton.classList.toggle('open');
        currentSidebar.classList.toggle('open');
        currentOverlay.classList.toggle('visible');
        
        // Prevent body scroll when sidebar is open
        document.body.style.overflow = isOpen ? '' : 'hidden';
      };

      // Handle menu button click
      const handleMenuClick = (e) => {
        e.stopPropagation();
        toggleMenu();
      };

      // Handle overlay click
      const handleOverlayClick = () => {
        toggleMenu();
      };

      // Handle outside click
      const handleOutsideClick = (e) => {
        const currentSidebar = document.querySelector('.sidebar');
        const currentButton = document.querySelector('.menu-button');
        
        if (currentSidebar?.classList.contains('open') &&
            !currentSidebar.contains(e.target) &&
            !currentButton?.contains(e.target)) {
          toggleMenu();
        }
      };

      // Handle escape key
      const handleEscapeKey = (e) => {
        const currentSidebar = document.querySelector('.sidebar');
        if (e.key === 'Escape' && currentSidebar?.classList.contains('open')) {
          toggleMenu();
        }
      };

      // Add event listeners
      menuButton.addEventListener('click', handleMenuClick);
      overlay.addEventListener('click', handleOverlayClick);
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleEscapeKey);

      // Store cleanup function
      cleanup = () => {
        menuButton.removeEventListener('click', handleMenuClick);
        overlay.removeEventListener('click', handleOverlayClick);
        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('keydown', handleEscapeKey);
        overlay.remove();
      };
    }, 100);

    // Return cleanup function
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  };

  // Initialize mobile menu and store cleanup
  const mobileMenuCleanup = initMobileMenu();

  // Cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
    document.removeEventListener('touchstart', handleScrollStart);
    document.removeEventListener('touchend', handleScrollEnd);
    if ('visualViewport' in window) {
      window.visualViewport.removeEventListener('resize', handleKeyboardVisibility);
      window.visualViewport.removeEventListener('scroll', handleKeyboardVisibility);
    }
    // Clean up mobile menu
    if (mobileMenuCleanup) {
      mobileMenuCleanup();
    }
  };
};

// Detect iOS device
export const isIOS = () => {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
};

// Get safe area insets
export const getSafeAreaInsets = () => {
  const root = document.documentElement;
  return {
    top: parseInt(getComputedStyle(root).getPropertyValue('--sat') || '0'),
    right: parseInt(getComputedStyle(root).getPropertyValue('--sar') || '0'),
    bottom: parseInt(getComputedStyle(root).getPropertyValue('--sab') || '0'),
    left: parseInt(getComputedStyle(root).getPropertyValue('--sal') || '0')
  };
};

// Export all functions as named exports
export default {
  initMobileViewport,
  isIOS,
  getSafeAreaInsets
}; 