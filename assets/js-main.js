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

const initHeader = () => {
	const megamenus = document.querySelectorAll("[data-menu-target]");
	const megamenuTriggers = document.querySelectorAll("[data-menu-trigger]");
	const globalOverlay = document.querySelector(".js-g-overlay");

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

	on("body", "click", "[data-menu-trigger]", (e) => {
		const trigger = e.target.closest("[data-menu-trigger]");
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
	});
};

document.addEventListener("DOMContentLoaded", () => {
	initHeader();
	initVideo();

	// execute page specific functions
	switch (root.classList[0]) {
		case "template-product":
			initPDP();
			break;
	}
});

ariaFocusManager.init();
