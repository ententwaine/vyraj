import './style.css';

document.addEventListener('DOMContentLoaded', () => {
  
  // --- PARALLAX EFFECT ---
  const heroCharacter = document.querySelector('.hero-character');
  const heroContent = document.querySelector('.hero-content');
  const heroBg = document.querySelector('.hero-bg');
  
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    
    // Parallax logic
    if (heroCharacter) {
      // Character moves slower than scroll
      const speed = parseFloat(heroCharacter.getAttribute('data-speed')) || 0.5;
      heroCharacter.style.transform = `translateX(-50%) translateY(${scrollY * speed}px)`;
    }
    
    if (heroContent) {
      // Content moves a bit faster to create depth
      const speed = parseFloat(heroContent.getAttribute('data-speed')) || 1.2;
      heroContent.style.transform = `translateY(${scrollY * speed * 0.3}px)`;
      // Fade out content as we scroll down
      heroContent.style.opacity = Math.max(0, 1 - (scrollY / 500));
    }

    if (heroBg) {
      heroBg.style.transform = `translateY(${scrollY * 0.2}px)`;
    }
  });

  // --- SCROLL REVEAL (INTERSECTION OBSERVER) ---
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-up');
  
  const revealOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
  };

  const revealOnScroll = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        return;
      } else {
        entry.target.classList.add('active');
        // observer.unobserve(entry.target); // Uncomment to only animate once
      }
    });
  }, revealOptions);

  revealElements.forEach(el => {
    revealOnScroll.observe(el);
  });

  // --- GLITCH EFFECT ON BUTTONS ---
  // Optional: add random glitch intervals to button hovers
  const buttons = document.querySelectorAll('.cyber-btn');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      const glitch = btn.querySelector('.btn-glitch');
      if(glitch) {
        glitch.style.display = 'block';
      }
    });
    btn.addEventListener('mouseleave', () => {
      const glitch = btn.querySelector('.btn-glitch');
      if(glitch) {
        glitch.style.display = 'none';
      }
    });
  });

});
