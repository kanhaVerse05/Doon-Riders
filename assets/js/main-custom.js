// DOON Riders / Autoev Onepage JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // 1. Preloader
  const preloader = document.getElementById('preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        preloader.classList.add('loaded');
      }, 400);
    });
    // Fallback in case load already fired
    setTimeout(() => {
      preloader.classList.add('loaded');
    }, 1200);
  }

  // 2. Sticky Header
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // 3. Mobile Navigation Menu Toggle
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      hamburger.classList.toggle('active');
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        hamburger.classList.remove('active');
      });
    });
  }

  // 4. Scrollspy for Active Nav Link
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');
      const targetLink = document.querySelector(`.nav-menu a[href*='${sectionId}']`);
      
      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinks.forEach(l => l.classList.remove('active'));
        if (targetLink) targetLink.classList.add('active');
      }
    });
  });

  // 5. FAQ Accordion Toggle
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const header = item.querySelector('.faq-header');
    const body = item.querySelector('.faq-body');
    
    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all others
      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
        const otherBody = otherItem.querySelector('.faq-body');
        if (otherBody) otherBody.style.maxHeight = null;
      });

      if (!isActive) {
        item.classList.add('active');
        body.style.maxHeight = body.scrollHeight + 'px';
      } else {
        item.classList.remove('active');
        body.style.maxHeight = null;
      }
    });
  });

  // Open first FAQ by default
  if (faqItems.length > 0) {
    const firstItem = faqItems[0];
    const firstBody = firstItem.querySelector('.faq-body');
    firstItem.classList.add('active');
    if (firstBody) firstBody.style.maxHeight = firstBody.scrollHeight + 'px';
  }

  // 6. Stat Counter Animation
  const counters = document.querySelectorAll('.stat-number');
  let counted = false;

  const startCounters = () => {
    counters.forEach(counter => {
      const target = +counter.getAttribute('data-target');
      const suffix = counter.getAttribute('data-suffix') || '';
      let count = 0;
      const speed = target / 50;

      const updateCount = () => {
        count += speed;
        if (count < target) {
          counter.innerText = Math.ceil(count) + suffix;
          setTimeout(updateCount, 30);
        } else {
          counter.innerText = target + suffix;
        }
      };
      updateCount();
    });
  };

  const checkCountersScroll = () => {
    const statsBanner = document.querySelector('.stats-banner');
    if (!statsBanner || counted) return;

    const bannerPos = statsBanner.getBoundingClientRect().top;
    const screenPos = window.innerHeight;

    if (bannerPos < screenPos - 50) {
      startCounters();
      counted = true;
    }
  };

  window.addEventListener('scroll', checkCountersScroll);
  checkCountersScroll();

  // 7. Video Modal Popup
  const playBtn = document.querySelector('.play-video-btn');
  const videoModal = document.querySelector('.video-modal');
  const closeModalBtn = document.querySelector('.close-modal-btn');
  const videoIframe = document.querySelector('.video-container iframe');

  if (playBtn && videoModal && closeModalBtn) {
    playBtn.addEventListener('click', (e) => {
      e.preventDefault();
      videoModal.classList.add('active');
      if (videoIframe) {
        videoIframe.src = "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1";
      }
    });

    const closeModal = () => {
      videoModal.classList.remove('active');
      if (videoIframe) videoIframe.src = "";
    };

    closeModalBtn.addEventListener('click', closeModal);
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) closeModal();
    });
  }

  // 8. Newsletter / Contact feedback
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('input');
      if (input && input.value) {
        alert('Thank you for subscribing to DOON Riders!');
        input.value = '';
      }
    });
  }

  // 9. Book Test Drive trigger
  const bookBtns = document.querySelectorAll("a[href*='contact'], a[href*='book']");
  bookBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (btn.getAttribute('href') === '#' || btn.getAttribute('href').includes('contact')) {
        e.preventDefault();
        alert('Book a Test Drive: Thank you for your interest! A representative from DOON Riders will contact you shortly.');
      }
    });
  });
});
