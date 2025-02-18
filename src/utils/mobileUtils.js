// Handle viewport height for mobile browsers
export const initMobileViewport = () => {
  // Set initial viewport height
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // Handle viewport changes
  const handleResize = () => {
    // Avoid resize during scroll on iOS
    if (!document.body.classList.contains('scrolling')) {
      setVH();
    }
  };

  // Handle scroll start/end for iOS
  const handleScrollStart = () => {
    document.body.classList.add('scrolling');
  };

  const handleScrollEnd = () => {
    document.body.classList.remove('scrolling');
  };

  // Initial setup
  setVH();

  // Add event listeners
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
  document.addEventListener('touchstart', handleScrollStart);
  document.addEventListener('touchend', handleScrollEnd);

  // Handle keyboard visibility
  if ('visualViewport' in window) {
    window.visualViewport.addEventListener('resize', () => {
      if (window.visualViewport.height < window.innerHeight) {
        document.body.classList.add('keyboard-visible');
        document.querySelector('.message-input-container')?.classList.add('keyboard-visible');
      } else {
        document.body.classList.remove('keyboard-visible');
        document.querySelector('.message-input-container')?.classList.remove('keyboard-visible');
      }
    });
  }

  // Initialize mobile menu
  const initMobileMenu = () => {
    const menuButton = document.querySelector('.menu-button');
    const sidebar = document.querySelector('.sidebar');
    let overlay = document.querySelector('.sidebar-overlay');

    // Create overlay if it doesn't exist
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    const toggleMenu = () => {
      const isOpen = sidebar.classList.contains('open');
      menuButton.classList.toggle('open');
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
      
      // Prevent body scroll when sidebar is open
      document.body.style.overflow = isOpen ? '' : 'hidden';
    };

    // Handle menu button click
    menuButton?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Close menu when clicking overlay
    overlay.addEventListener('click', () => {
      toggleMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          !menuButton.contains(e.target)) {
        toggleMenu();
      }
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        toggleMenu();
      }
    });
  };

  // Initialize mobile menu
  initMobileMenu();

  // Cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
    document.removeEventListener('touchstart', handleScrollStart);
    document.removeEventListener('touchend', handleScrollEnd);
    if ('visualViewport' in window) {
      window.visualViewport.removeEventListener('resize', handleResize);
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