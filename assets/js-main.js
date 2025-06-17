// place global, component, and page level functions here
const playTargetVideo = (
	video,
	externalVideoType,
	player,
	soundOn = false,
	videoHasMuteBtn = false
) => {
	const playVideo = (video) => {
		video.muted = !(videoHasMuteBtn && soundOn);
		video.play();
	};

	const playExternalVideo = (player, externalVideoType) => {
		if (externalVideoType === "vimeo") {
			player.setMuted(!(videoHasMuteBtn && soundOn));
			player.play().catch((error) => {
				if (error.name !== "PlayInterrupted") {
					console.error("Error playing video:", error);
				}
			});
		} else if (externalVideoType === "youtube") {
			// Both functions existing means the YouTube player is fully initialized.
			if (
				typeof player.playVideo == "function" &&
				typeof player.mute === "function"
			) {
				videoHasMuteBtn && soundOn ? player.unMute() : player.mute();
				player.playVideo();
			} else {
				console.warn(
					"YouTube player not fully initialized or methods unavailable."
				);
			}
		}
	};

	if (video) {
		playVideo(video);
	} else if (player) {
		playExternalVideo(player, externalVideoType);
	}
};

const pauseTargetVideo = (video, externalVideoType, player) => {
	const pauseVideo = (video) => {
		video.pause();
		video.muted = true;
	};

	const pauseExternalVideo = (player, externalVideoType) => {
		if (externalVideoType === "vimeo") {
			player.pause().catch((error) => {
				if (error.name !== "PlayInterrupted") {
					console.error("Error pausing video:", error);
				}
			});
			player.setMuted(true);
		} else if (externalVideoType === "youtube") {
			// Both functions existing means the YouTube player is fully initialized.
			if (
				typeof player.pauseVideo === "function" &&
				typeof player.mute === "function"
			) {
				player.pauseVideo();
				player.mute();
			} else {
				console.warn(
					"YouTube player not fully initialized or methods unavailable."
				);
			}
		}
	};

	if (video) {
		pauseVideo(video);
	} else if (player) {
		pauseExternalVideo(player, externalVideoType);
	}
};
const initVideo = () => {
	const handleVideoPlayback = (item, play, targetPlayer) => {
		const videoElement = item.querySelector("video");
		const externalVideo = item.querySelector(".js-external-video");
		const externalVideoType = externalVideo?.dataset.videoHost;
		const videoHasMuteBtn = item.querySelector(
			".js-video-mute.is-active, .js-video-unmute.is-active"
		);
		const soundOn = videoHasMuteBtn?.classList.contains("js-video-mute");
		if (!videoElement && !targetPlayer) {
			return;
		}

		if (play) {
			playTargetVideo(
				videoElement,
				externalVideoType,
				targetPlayer,
				soundOn,
				videoHasMuteBtn
			);
		} else {
			pauseTargetVideo(videoElement, externalVideoType, targetPlayer);
		}
	};

	const handleVideoVisibility = (entry, item) => {
		const isVisible = entry.isIntersecting;
		const videoButtons = item.querySelectorAll(
			".js-video-mute, .js-video-unmute, .js-video-play, .js-video-pause"
		);
		const externalVideo = item.querySelector(".js-external-video");
		const externalVideoId = externalVideo?.dataset.videoId;
		const targetPlayer = allPlayersObj[externalVideoId];

		handleVideoPlayback(item, isVisible, targetPlayer);

		// Reset video buttons and toggle based on visibility
		videoButtons.forEach((button) => button.classList.remove("is-active"));
		if (isVisible) {
			item.querySelector(".js-video-unmute")?.classList.add("is-active");
			item.querySelector(".js-video-pause")?.classList.add("is-active");
		}
	};

	// always play/pause video if section is in view
	document.querySelectorAll(".c-video").forEach((item) => {
		const observer = new IntersectionObserver(
			([entry]) => handleVideoVisibility(entry, item),
			{ root: null, threshold: [0.4] }
		);
		observer.observe(item);
	});

	const handleVideoControl = (e, action) => {
		const target = e.target.closest(`.js-video-${action}`);
		const videoContainer = target.closest(".c-video");
		const videoElement = videoContainer.querySelector("video");
		const externalVideo = videoContainer.querySelector(".js-external-video");
		const videoHasMuteBtn = videoContainer.querySelector(
			".js-video-mute.is-active, .js-video-unmute.is-active"
		);
		const soundOn = videoHasMuteBtn?.classList.contains("js-video-mute");
		const externalVideoType = externalVideo?.dataset.videoHost;
		const externalVideoId = externalVideo?.dataset.videoId;
		const targetPlayer = allPlayersObj[externalVideoId];

		if (action === "play") {
			playTargetVideo(
				videoElement,
				externalVideoType,
				targetPlayer,
				soundOn,
				videoHasMuteBtn
			);
		} else if (action === "pause") {
			pauseTargetVideo(videoElement, externalVideoType, targetPlayer);
		} else if (action === "mute" || action === "unmute") {
			if (externalVideoType === "youtube") {
				if (typeof targetPlayer.unMute == "function") {
					targetPlayer.isMuted() ? targetPlayer.unMute() : targetPlayer.mute();
				} else {
					console.warn(
						"YouTube player not fully initialized or methods unavailable."
					);
				}
			} else if (externalVideoType === "vimeo") {
				targetPlayer.getMuted().then((muted) => targetPlayer.setMuted(!muted));
			} else if (videoElement) {
				videoElement.muted = action === "mute" ? true : false;
			}
		}

		// Toggle play/pause or mute/unmute button visibility
		if (action === "play" || action === "pause") {
			target.classList.remove("is-active");
			videoContainer
				.querySelector(`.js-video-${action === "play" ? "pause" : "play"}`)
				?.classList.add("is-active");
		} else if (action === "mute" || action === "unmute") {
			videoContainer
				.querySelector(".js-video-mute")
				?.classList.toggle("is-active", action === "unmute");
			videoContainer
				.querySelector(".js-video-unmute")
				?.classList.toggle("is-active", action === "mute");
		}
	};

	on("body", "click", ".js-video-mute", (e) => handleVideoControl(e, "mute"));
	on("body", "click", ".js-video-unmute", (e) =>
		handleVideoControl(e, "unmute")
	);
	on("body", "click", ".js-video-play", (e) => handleVideoControl(e, "play"));
	on("body", "click", ".js-video-pause", (e) => handleVideoControl(e, "pause"));

	on("body", "click", ".js-product-hero-slider-thumbnail", (e) => {
		// Note: The setFirstActiveImage function triggers this click event
		const sliderSelector = `.js-product-hero-slider${
			window.innerWidth <= 1024 ? "" : ".is-scroll"
		}`;
		const slider = e.target.closest(sliderSelector);

		// Exit if no slider or no video in the slider
		if (!slider || !slider.querySelector(".c-video")) return;

		// Pause all videos in the slider
		slider.querySelectorAll(".c-video").forEach((videoContainer) => {
			const videoElement = videoContainer.querySelector("video");
			const externalVideo = videoContainer.querySelector(".js-external-video");
			const externalVideoType = externalVideo?.dataset.videoHost;
			const externalVideoId = externalVideo?.dataset.videoId;
			const targetPlayer = externalVideoId
				? allPlayersObj[externalVideoId]
				: null;

			pauseTargetVideo(videoElement, externalVideoType, targetPlayer);

			// Reset video buttons
			videoContainer
				.querySelectorAll(
					".js-video-mute, .js-video-unmute, .js-video-play, .js-video-pause"
				)
				.forEach((button) => button.classList.remove("is-active"));
		});

		// Play the target video after a short delay
		setTimeout(() => {
			const activeVideoContainer = slider.querySelector(
				".js-slider-block.is-active .c-video"
			);
			if (!activeVideoContainer) return;

			const videoElement = activeVideoContainer.querySelector("video");
			const externalVideo =
				activeVideoContainer.querySelector(".js-external-video");
			const externalVideoType = externalVideo?.dataset.videoHost;
			const externalVideoId = externalVideo?.dataset.videoId;
			const targetPlayer = externalVideoId
				? allPlayersObj[externalVideoId]
				: null;

			playTargetVideo(videoElement, externalVideoType, targetPlayer);

			activeVideoContainer
				.querySelectorAll(".js-video-unmute, .js-video-pause")
				.forEach((button) => button.classList.add("is-active"));
		}, 100);
	});
};

const initPDP = () => {
	const productHero = document.querySelector(".product-hero");
	const productImages = Array.from(
		productHero.querySelectorAll(".js-slider-block:not(.is-hidden)")
	);
	const thumbs = Array.from(
		productHero.querySelectorAll(
			".js-product-hero-slider-thumbnail:not(.is-hidden)"
		)
	);

	// reframe for .is-fade.is-natural
	reframe(".is-fade.is-natural .c-video iframe", "c-video__reframe");

	// Note: Displaying generic or variant-specific images is controlled in cProductForm.init()

	// set the first active image
	const setFirstActiveImage = () => {
		const defaultActiveImage = productImages[0];
		const defaultActiveThumbnail = thumbs[0];
		if (defaultActiveImage) {
			defaultActiveImage.classList.add("is-active");
			defaultActiveThumbnail.classList.add("is-active");
		}
	};
	setFirstActiveImage();

	// hero slider thumbnail functions
	if (!vs.isTouchDevice) {
		// hide thumbnails after a period of time
		const hideThumbsThreshold = 5000;
		setTimeout(() => {
			productHero.classList.remove("is-interacted");
		}, hideThumbsThreshold);
		// hide thumbnails when not hover the slider
		on("body", "mouseover", ".js-product-hero-slider", (e) => {
			productHero.classList.add("is-interacted");
		});
		on("body", "mouseout", ".js-product-hero-slider", (e) => {
			productHero.classList.remove("is-interacted");
		});
	}

	// set thumb & slider-block to active base on scroll direction
	// Function to get the currently intersecting image
	let currentIndex = 1;
	function getCurrentMediaIndex(entries) {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				currentIndex = entry.target.dataset.sliderIndex;
			}
		});
		return currentIndex;
	}

	// Function to update the active media
	function updateActiveMedia(currentIndex) {
		productImages.forEach((img) => {
			img.classList.toggle(
				"is-active",
				img.getAttribute("data-slider-index") === currentIndex
			);
		});

		thumbs.forEach((thumb) => {
			thumb.classList.toggle(
				"is-active",
				thumb.getAttribute(`data-slider-index`) == currentIndex
			);
		});
	}

	// update the thumbnails based on the image in view
	// tabletUp only since mobile slider is not scrollable
	if (
		productHero.querySelector(".js-scroll-container.is-scroll") &&
		!vs.isTabletScreen
	) {
		productImages.forEach((img) => {
			const observer = new IntersectionObserver(
				(entries) => {
					const currentIndex = getCurrentMediaIndex(entries);

					updateActiveMedia(currentIndex);
				},
				{
					root: null,
					threshold: [0.4], // 0 = page start; 1 = page bottom, items only revealed when in full view
				}
			);
			observer.observe(img);
		});
	}

	on("body", "click", ".js-product-hero-slider-thumbnail", (e) => {
		let trigger = e.target.closest(".js-product-hero-slider-thumbnail");
		// get current active ones
		const productImages = Array.from(
			productHero.querySelectorAll(".js-slider-block:not(.is-hidden)")
		);
		const thumbs = Array.from(
			productHero.querySelectorAll(
				".js-product-hero-slider-thumbnail:not(.is-hidden)"
			)
		);

		thumbs.forEach((thumb) => {
			thumb.classList.remove("is-active");
		});

		trigger.classList.add("is-active");

		productImages.forEach((img) => {
			const isTargetImg =
				img.dataset.sliderIndex == trigger.dataset.sliderIndex;

			img.classList.toggle("is-active", isTargetImg);

			if (isTargetImg && !vs.isTabletScreen) {
				img.scrollIntoView({
					behavior: "smooth",
				});
			}
		});
	});

	// set modelViewer attributes
	productHero.querySelectorAll("model-viewer").forEach((model) => {
		const attributes = {
			"disable-zoom": "",
			// Add more attributes here if needed
		};
		Object.keys(attributes).forEach((key) => {
			model.setAttribute(key, attributes[key]);
		});
	});
};

// Load Vimeo / Youtube players
let allPlayersObj = {};
// youtube fix - lace this event at global level
window.onYouTubeIframeAPIReady = () => {
	document
		.querySelectorAll('.js-external-video[data-video-host="youtube"]')
		.forEach((video) => {
			const externalVideoId = video.dataset.videoId;
			const player = new YT.Player(video, {
				videoId: externalVideoId,
				playerVars: { playsinline: 1 },
			});
			allPlayersObj[externalVideoId] = player;
		});
};

window.addEventListener("load", () => {
	document
		.querySelectorAll('.js-external-video[data-video-host="vimeo"]')
		.forEach((video) => {
			const externalVideoId = video.dataset.videoId;
			const player = new Vimeo.Player(video);
			player.on("loaded", () => (allPlayersObj[externalVideoId] = player));
		});

	setTimeout(() => {
		// set a slight delay for player to load completely
		initVideo();
	}, 400);
});

class ComponentAccordion extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.addEventListener("click", this.handleClick);
	}

	disconnectedCallback() {
		this.removeEventListener("click", this.handleClick);
	}

	handleClick(e) {
		const toggle = e.target.closest(".js-accordion-toggle");

		if (toggle) {
			const accordion = toggle.closest(".c-accordion");
			const closeSiblings = accordion.classList.contains("is-close-siblings");
			this.toggleAccordion(accordion, closeSiblings);
		}
	}

	toggleAccordion(accordion, closeSiblings) {
		const accordionContent = accordion.querySelector(".js-accordion-content");

		if (closeSiblings) {
			getSiblings(accordion).forEach((item) => {
				if (item.classList.contains("is-active")) {
					this.toggleAccordion(item, false);
				}
			});
		}

		accordion.classList.toggle("is-active");

		if (accordion.classList.contains("is-active")) {
			accordion.setAttribute("aria-expanded", true);
			accordionContent.setAttribute("aria-hidden", false);
			accordionContent.style.height = `${
				accordionContent.querySelector("div").offsetHeight
			}px`;
		} else {
			accordion.setAttribute("aria-expanded", false);
			accordionContent.setAttribute("aria-hidden", true);
			accordionContent.style.height = "0px";
		}
	}
}

customElements.define("c-accordion", ComponentAccordion);
class ComponentSlider extends HTMLElement {
	constructor() {
		super();
		this.viewportNode = this.querySelector(".js-embla-viewport");
		this.prevButtonNode = this.querySelector(".js-embla-button-prev");
		this.nextButtonNode = this.querySelector(".js-embla-button-next");
		this.dotsNode = this.querySelector(".js-embla-dots");
		this.progressNode = this.querySelector(".js-progress-bar");
		this.isVertical = this.dataset.emblaVertical === "true";

		//Sync
		this.enableSync = this.dataset.emblaSync === "true";

		// Plugins
		this.enableWheel = this.dataset.emblaWheel === "true";
		this.enableFade = this.dataset.emblaFade === "true";
		this.enableAutoHeight = this.dataset.emblaAutoHeight === "true";
		this.enableAutoplay = this.dataset.emblaAutoplay === "true";
		const autoplayDelay = this.hasAttribute("data-embla-delay")
			? parseInt(this.dataset.emblaDelay)
			: 4000;
		const autoplay = EmblaCarouselAutoplay({
			playOnInit: this.enableAutoplay,
			delay: autoplayDelay,
			stopOnInteraction: false,
			stopOnMouseEnter: true,
		});
		this.enableAutoScroll = this.dataset.emblaAutoScroll === "true";
		const autoScrollSpeed = this.hasAttribute("data-embla-scroll-speed")
			? parseInt(this.dataset.emblaScrollSpeed)
			: 2;
		const autoScrollDelay = this.hasAttribute("data-embla-scroll-delay")
			? parseInt(this.dataset.emblaScrollDelay)
			: 0;
		const autoScrollDirection =
			this.dataset.emblaScrollBackward === "true" ? "backward" : "forward";
		const autoScroll = EmblaCarouselAutoScroll({
			playOnInit: this.enableAutoScroll,
			speed: autoScrollSpeed,
			startDelay: autoScrollDelay,
			direction: autoScrollDirection,
			stopOnInteraction: false,
			stopOnMouseEnter: false,
		});

		const plugins = [
			EmblaCarouselClassNames(),
			...(this.enableWheel ? [EmblaCarouselWheelGestures()] : []),
			...(this.enableAutoplay ? [autoplay] : []),
			...(this.enableAutoScroll ? [autoScroll] : []),
			...(this.enableFade ? [EmblaCarouselFade()] : []),
			...(this.enableAutoHeight ? [EmblaCarouselAutoHeight()] : []),
		];

		const options = {
			axis: this.isVertical ? "y" : "x",
			...JSON.parse(this.dataset.emblaSlider.replace(/'/g, '"').trim()),
		};
		if (vs.isTouchDevice && this.closest(".s-data__blocks")) {
			options.watchDrag = false;
		}

		// Init Embla
		this.embla = EmblaCarousel(this.viewportNode, options, plugins);
		// destroy embla if contains only one item
		this.slideNodes = this.embla.slideNodes();
		if (this.slideNodes.length === 1) {
			this.classList.add("is-inactive");
			this.embla.destroy();
		}
	}

	connectedCallback() {
		this.initializeNavigation();
	}

	// Prev & Next Buttons
	addTogglePrevNextBtnsActive = (emblaApi, prevBtn, nextBtn) => {
		const togglePrevNextBtnsState = () => {
			if (emblaApi.canScrollPrev()) prevBtn.removeAttribute("disabled");
			else prevBtn.setAttribute("disabled", "disabled");

			if (emblaApi.canScrollNext()) nextBtn.removeAttribute("disabled");
			else nextBtn.setAttribute("disabled", "disabled");
		};

		emblaApi
			.on("select", togglePrevNextBtnsState)
			.on("init", togglePrevNextBtnsState)
			.on("reInit", togglePrevNextBtnsState);

		return () => {
			prevBtn.removeAttribute("disabled");
			nextBtn.removeAttribute("disabled");
		};
	};
	addPrevNextBtnsClickHandlers = (emblaApi, prevBtn, nextBtn) => {
		const scrollPrev = () => {
			emblaApi.scrollPrev();
		};
		const scrollNext = () => {
			emblaApi.scrollNext();
		};
		prevBtn.addEventListener("click", scrollPrev, false);
		nextBtn.addEventListener("click", scrollNext, false);

		const removeTogglePrevNextBtnsActive = this.addTogglePrevNextBtnsActive(
			emblaApi,
			prevBtn,
			nextBtn
		);

		return () => {
			removeTogglePrevNextBtnsActive();
			prevBtn.removeEventListener("click", scrollPrev, false);
			nextBtn.removeEventListener("click", scrollNext, false);
		};
	};

	// Dots
	addDotBtnsAndClickHandlers = (emblaApi, dotsNode) => {
		let dotNodes = [];

		const addDotBtnsWithClickHandlers = () => {
			dotsNode.innerHTML = emblaApi
				.scrollSnapList()
				.map(
					(el, i) =>
						`<button class="embla__dot c-slider__dot increase-target-size" type="button" data-trigger-sync=${i}></button>`
				)
				.join("");

			const scrollTo = (index) => {
				emblaApi.scrollTo(index);
			};

			dotNodes = Array.from(dotsNode.querySelectorAll(".embla__dot"));
			dotNodes.forEach((dotNode, index) => {
				dotNode.addEventListener("click", () => scrollTo(index), false);
			});
		};

		const toggleDotBtnsActive = () => {
			const previous = emblaApi.previousScrollSnap();
			const selected = emblaApi.selectedScrollSnap();
			dotNodes[previous].classList.remove("is-active");
			dotNodes[selected].classList.add("is-active");
		};

		emblaApi
			.on("init", addDotBtnsWithClickHandlers)
			.on("reInit", addDotBtnsWithClickHandlers)
			.on("init", toggleDotBtnsActive)
			.on("reInit", toggleDotBtnsActive)
			.on("select", toggleDotBtnsActive);

		return () => {
			dotsNode.innerHTML = "";
		};
	};
	// Progress Bar
	setupProgressBar = (emblaApi, progressNode) => {
		const applyProgress = () => {
			const progress = Math.max(0, Math.min(1, emblaApi.scrollProgress()));
			progressNode.style.transform = `translate3d(${progress * 100}%,0px,0px)`;
		};

		const removeProgress = () => {
			progressNode.removeAttribute("style");
		};

		return {
			applyProgress,
			removeProgress,
		};
	};
	syncSliderWithTrigger = () => {};
	initializeNavigation = () => {
		if (this.slideNodes.length === 1) return;
		if (this.prevButtonNode && this.nextButtonNode) {
			const removePrevNextBtnsClickHandlers = this.addPrevNextBtnsClickHandlers(
				this.embla,
				this.prevButtonNode,
				this.nextButtonNode
			);
			this.embla.on("destroy", removePrevNextBtnsClickHandlers);
		}

		if (this.progressNode) {
			const { applyProgress, removeProgress } = this.setupProgressBar(
				this.embla,
				this.progressNode
			);

			this.embla
				.on("init", applyProgress)
				.on("reInit", applyProgress)
				.on("scroll", applyProgress)
				.on("slideFocus", applyProgress)
				.on("destroy", removeProgress);
		}

		if (this.dotsNode) {
			const removeDotBtnsAndClickHandlers = this.addDotBtnsAndClickHandlers(
				this.embla,
				this.dotsNode
			);
			this.embla.on("destroy", removeDotBtnsAndClickHandlers);
		}

		//Sync element triggers /discovery page origin section
		if (this.enableSync) {
			this.embla.on("select", () => {
				const trigger = this.dotsNode.querySelector(".c-slider__dot.is-active");
				const parent = trigger.closest(".js-slider-sync");

				if (trigger) {
					const triggerEl = parent.querySelector(
						`[data-trigger="${trigger.dataset.triggerSync}"]`
					);
					const targetEl = parent.querySelector(
						`[data-target="${trigger.dataset.triggerSync}"]`
					);
					getSiblings(triggerEl).forEach((item) => {
						item.classList.remove("is-active");
					});
					getSiblings(targetEl).forEach((item) => {
						item.classList.remove("is-active");
					});
					triggerEl.classList.add("is-active");
					targetEl.classList.add("is-active");

					if (triggerEl.parentElement) {
						triggerEl.parentElement.scrollLeft = triggerEl.offsetLeft - 40;
					}
				}
			});

			on("body", "click", ".js-slider-sync [data-trigger]", (e) => {
				const triggerValue = e.target.closest("[data-trigger]").dataset.trigger;
				this.embla.scrollTo(parseInt(triggerValue));
			});
		}
	};
}

customElements.define("c-slider", ComponentSlider);

class GlobalLightbox {
	constructor() {
		this.lightboxElement = document.querySelector(".js-lightbox-content");
		this.lightboxHeader = document.querySelector(".js-lightbox-header");
		this.currentIndex = 0;
		this.images = [];
		this.isOpen = false;
		this.fadeTimeout = null;

		this.init();
	}

	init() {
		// Add event listeners for all lightbox triggers
		document.addEventListener("click", (e) => {
			if (e.target.closest(".js-lightbox-trigger")) {
				e.preventDefault();
				this.handleTriggerClick(e.target.closest(".js-lightbox-trigger"));
			}
		});

		// Add keyboard navigation
		document.addEventListener("keydown", (e) => {
			if (!this.isOpen) return;

			switch (e.key) {
				case "Escape":
					this.close();
					break;
				case "ArrowLeft":
					this.prev();
					break;
				case "ArrowRight":
					this.next();
					break;
			}
		});
	}

	handleTriggerClick(trigger) {
		// Find the parent slider container
		const parent = trigger.closest(".js-lightbox-trigger-parent");

		this.lightboxAction = parent.querySelector(".js-lightbox-action");
		this.lightboxTitle = parent.querySelector(".js-lightbox-title");

		// Collect all images from the same slider
		const triggers = parent.querySelectorAll(".js-lightbox-trigger");
		this.images = [];

		triggers.forEach((t, index) => {
			const img = t.querySelector("img");
			if (img) {
				this.images.push({
					src: img.dataset.src,
					srcset: img.dataset.srcset || "",
					alt: img.alt || "",
					index: index,
				});

				// Set current index if this is the clicked trigger
				if (t === trigger) {
					this.currentIndex = index;
				}
			}
		});

		if (this.images.length > 0) {
			this.open();
		}
	}

	addSwipeListeners() {
		let touchStartX = 0;
		let touchEndX = 0;

		const threshold = 50; // min distance for a swipe to be registered

		const onTouchStart = (e) => {
			touchStartX = e.changedTouches[0].screenX;
		};

		const onTouchEnd = (e) => {
			touchEndX = e.changedTouches[0].screenX;
			handleSwipeGesture();
		};

		const handleSwipeGesture = () => {
			const deltaX = touchEndX - touchStartX;

			if (Math.abs(deltaX) > threshold) {
				if (deltaX > 0) {
					this.prev();
				} else {
					this.next();
				}
			}
		};

		const lightboxMain =
			this.lightboxElement.querySelector(".g-lightbox__main");
		if (lightboxMain) {
			lightboxMain.addEventListener("touchstart", onTouchStart, {
				passive: true,
			});
			lightboxMain.addEventListener("touchend", onTouchEnd, { passive: true });
		}

		// Optional cleanup if needed later
		this.removeSwipeListeners = () => {
			if (lightboxMain) {
				lightboxMain.removeEventListener("touchstart", onTouchStart);
				lightboxMain.removeEventListener("touchend", onTouchEnd);
			}
		};
	}

	open() {
		this.isOpen = true;
		this.render();
		this.addSwipeListeners();
		root.classList.add("is-lightbox-active");
		scrollDisable();
	}

	close() {
		this.isOpen = false;
		root.classList.remove("is-lightbox-active");
		scrollEnable();
		if (this.removeSwipeListeners) this.removeSwipeListeners();

		// Clear content after animation
		setTimeout(() => {
			if (!this.isOpen) {
				this.lightboxElement.innerHTML = "";
				this.lightboxHeader.textContent = "";
			}
		}, 300);
	}

	next() {
		if (this.images.length <= 1) return;
		this.currentIndex = (this.currentIndex + 1) % this.images.length;
		this.updateImage();
	}

	prev() {
		if (this.images.length <= 1) return;
		this.currentIndex =
			this.currentIndex === 0 ? this.images.length - 1 : this.currentIndex - 1;
		this.updateImage();
	}

	goToSlide(index) {
		if (index >= 0 && index < this.images.length) {
			this.currentIndex = index;
			this.updateImage();
		}
	}

	updateImage() {
		const mainImage = this.lightboxElement.querySelector(".g-lightbox__image");
		const thumbnails = this.lightboxElement.querySelectorAll(
			".js-lightbox-thumbnail"
		);

		if (mainImage) {
			// Fade out
			mainImage.style.opacity = "0";

			// Clear any existing timeout
			if (this.fadeTimeout) {
				clearTimeout(this.fadeTimeout);
			}

			// Update image and fade in
			this.fadeTimeout = setTimeout(() => {
				const currentImage = this.images[this.currentIndex];
				mainImage.src = currentImage.src;
				if (currentImage.srcset) {
					mainImage.srcset = currentImage.srcset;
				}
				mainImage.alt = currentImage.alt;
				mainImage.style.opacity = "1";
			}, 150);
		}

		// Update thumbnails
		thumbnails.forEach((thumb, index) => {
			thumb.classList.toggle("is-active", index === this.currentIndex);
		});
	}

	render() {
		const currentImage = this.images[this.currentIndex];
		this.lightboxHeader.textContent = this.lightboxTitle.textContent;
		this.lightboxElement.innerHTML = `
			${
				this.images.length > 1
					? `
				<div class="g-lightbox__sidebar g g-4">
					${this.images
						.map(
							(img, index) => `
						<button class="g-lightbox__thumbnail js-lightbox-thumbnail ${
							index === this.currentIndex ? "is-active" : ""
						}" data-index="${index}">
							<img src="${img.src}" alt="${img.alt}">
						</button>
					`
						)
						.join("")}
				</div>
			`
					: ""
			}
			<div class="g-lightbox__main">
				<img
					class="g-lightbox__image"
					src="${currentImage.src}"
					${currentImage.srcset ? `srcset="${currentImage.srcset}"` : ""}
					alt="${currentImage.alt}"
				>

				${
					this.images.length > 1
						? `<button class="g-lightbox__nav g-lightbox__nav--prev js-lightbox-nav" aria-label="Previous image">
						<span class="icon-caret-left" />
					</button>
					<button class="g-lightbox__nav g-lightbox__nav--next js-lightbox-nav" aria-label="Next image">
						<span class="icon-caret-right" />
					</button>
				`
						: ""
				}
			</div>

			${
				this.lightboxAction
					? `<div class="g-lightbox__action">${this.lightboxAction.outerHTML}</div>`
					: ""
			}
    `;

		this.addEventListeners();
	}

	addEventListeners() {
		on("body", "click", ".js-lightbox-close", (e) => {
			this.close();
		});

		on("body", "click", ".js-lightbox-nav", (e) => {
			const target = e.target.closest(".js-lightbox-nav");
			const isPrev = target.classList.contains("g-lightbox__nav--prev");
			isPrev ? this.prev() : this.next();
		});

		on("body", "click", ".js-lightbox-thumbnail", (e) => {
			const target = e.target.closest(".js-lightbox-thumbnail");
			this.goToSlide(parseInt(target.dataset.index));
		});
	}
}

// Also initialize if script loads after DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		new GlobalLightbox();
	});
} else {
	new GlobalLightbox();
}

const initHeader = () => {
	const megamenus = document.querySelectorAll("[data-menu-target]");
	const megamenuTriggers = document.querySelectorAll("[data-menu-trigger]");
	const globalOverlay = document.querySelector(".js-g-overlay");

	const openMegaMenu = (event) => {
		const trigger = event.target.closest("[data-menu-trigger]");
		const triggerValue = trigger.dataset.menuTrigger;
		const target = document.querySelector(
			`[data-menu-target="${triggerValue}"]`
		);

		// Check if this trigger is already active
		const isCurrentlyActive = trigger.classList.contains("is-active");
		// Remove active class from all triggers and menus
		closeMenus();

		// Toggle: only add active class if it wasn't already active
		if (!isCurrentlyActive && target) {
			trigger.classList.add("is-active");
			target.classList.add("is-active");
			root.classList.add("is-megamenu-active");
		}
		toggleOverlay(isCurrentlyActive);
	};

	const closeMenus = () => {
		megamenuTriggers.forEach((t) => t.classList.remove("is-active"));
		megamenus.forEach((menu) => menu.classList.remove("is-active"));
		root.classList.remove("is-megamenu-active");
	};

	const toggleOverlay = (isActive = false) => {
		globalOverlay.setAttribute("tabindex", isActive ? 0 : -1);
		globalOverlay.setAttribute("aria-hidden", !isActive);
	};

	on("body", "click", ".js-g-overlay", () => {
		closeMenus();
		root.classList.remove("is-search-active");
	});

	on("body", "mouseover", ".js-g-overlay", () => {
		closeMenus();
	});

	on("body", "click", "[data-menu-trigger]", (event) => {
		openMegaMenu(event);
	});

	on("body", "mouseover", "[data-menu-trigger]", (event) => {
		openMegaMenu(event);
	});

	const imageTargets = document.querySelectorAll("[data-images-target]");
	on("body", "mouseover", "[data-images-trigger]", (e) => {
		const trigger = e.target.closest("[data-images-trigger]");
		const triggerValue = trigger.dataset.imagesTrigger;
		imageTargets.forEach((target) => {
			const targetValue = target.dataset.imagesTarget;
			target.classList.toggle("is-active", triggerValue == targetValue);
		});
	});

	on("body", "mouseout", "[data-images-trigger]", (e) => {
		imageTargets.forEach((target) => {
			target.classList.remove("is-active");
		});
	});

	// Mobile Menu

	on("body", "click", ".js-mobile-menu-toggle", (e) => {
		if (root.classList.contains("mobile-menu-is-active")) {
			root.classList.remove("mobile-menu-is-active");
			scrollEnable();
		} else {
			root.classList.add("mobile-menu-is-active");
			scrollDisable();
		}
	});
};

const gArticleTruncate = {
	// Selecting the article elements
	truncateContainer: document.querySelector(".truncate-container"),
	truncatedDiv: document.querySelector("#truncated-product-description"),
	readMoreBtn: document.querySelector("#read-more"),
	readLessBtn: document.querySelector("#read-less"),
	fullContent: null,

	// Sets initial state - show truncated, hide full content
	setInitialState: function () {
		if (!this.truncateContainer) return false;

		// Get the full content element (next sibling after truncated div)
		this.fullContent = this.truncatedDiv.nextElementSibling;

		// Initial state: show truncated, hide full content and read less button
		this.truncatedDiv.style.display = "block";
		this.fullContent.style.display = "none";
		this.readLessBtn.style.display = "none";
	},

	// Shows the full article content
	showFullContent: function () {
		// Hide truncated content
		this.truncatedDiv.style.display = "none";

		// Show full content and read less button
		this.fullContent.style.display = "block";
		this.readLessBtn.style.display = "inline";

		// Optional: smooth scroll to full content
		this.fullContent.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	},

	// Shows the truncated article content
	showTruncatedContent: function () {
		// Hide full content and read less button
		this.fullContent.style.display = "none";
		this.readLessBtn.style.display = "none";

		// Show truncated content
		this.truncatedDiv.style.display = "block";

		// Optional: smooth scroll back to truncated content
		this.truncatedDiv.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	},

	// Toggles between truncated and full content
	toggleContent: function (showFull) {
		if (showFull) {
			this.showFullContent();
		} else {
			this.showTruncatedContent();
		}
	},

	// Binds event listeners
	bindEvents: function () {
		if (!this.truncateContainer) return false;

		// Show more functionality
		this.readMoreBtn.addEventListener("click", (e) => {
			e.preventDefault();
			this.toggleContent(true);
		});

		// Show less functionality
		this.readLessBtn.addEventListener("click", (e) => {
			e.preventDefault();
			this.toggleContent(false);
		});
	},

	// Initialize the article content functionality
	init: function () {
		if (
			this.truncateContainer &&
			this.truncatedDiv &&
			this.readMoreBtn &&
			this.readLessBtn
		) {
			this.setInitialState();
			this.bindEvents();
		}
	},
};

document.addEventListener("DOMContentLoaded", () => {
	new GlobalLightbox();
	initHeader();
	initVideo();
	gArticleTruncate.init();

	// execute page specific functions
	switch (root.classList[0]) {
		case "template-product":
			initPDP();
			break;
	}
});

ariaFocusManager.init();
