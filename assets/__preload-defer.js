const afterFooter = {
	setSpacingCssVariables: function () {
		// Set responsive variables
		const announcement = document.querySelector(".g-announcement");
		const header = document.querySelector(".g-header");
		const footer = document.querySelector(".g-footer");

		const setResponsiveVariables = () => {
			root.style.setProperty(
				"--s-announcement",
				`${announcement ? announcement.offsetHeight : 0}px`
			);

			root.style.setProperty(
				"--s-header",
				`${header ? header.offsetHeight : 0}px`
			);

			root.style.setProperty(
				"--s-footer",
				`${footer ? footer.offsetHeight : 0}px`
			);
		};
		setResponsiveVariables();
		window.addEventListener("resize", setResponsiveVariables);
	},
	avoidStyleFlash: function () {
		// .avoid-style-flash elements turns visible
		setTimeout(() => {
			document.querySelectorAll(".avoid-style-flash").forEach((el) => {
				el.style.visibility = "visible";
			});
		}, 400);
	},
	init: function () {
		root.classList.add("is-loaded");
		this.setSpacingCssVariables();
		this.avoidStyleFlash();
	},
};

const ariaFocusManager = {
	tabindexCache: new WeakMap(),

	updateFocusableElements: function () {
		const focusableSelectors = [
			"a[href]",
			"input:not([disabled])",
			"textarea:not([disabled])",
			"select:not([disabled])",
			"button:not([disabled])",
			"iframe",
			"details",
			"[contenteditable]",
			"[tabindex]:not([disabled])",
		];

		const elementsWithAriaHidden = document.querySelectorAll("[aria-hidden]");

		elementsWithAriaHidden.forEach((element) => {
			const isHidden = element.getAttribute("aria-hidden") === "true";
			const focusableChildren = element.querySelectorAll(
				focusableSelectors.join(", ")
			);

			focusableChildren.forEach((child) => {
				// Cache the original tabindex value if not already cached
				if (!this.tabindexCache.has(child)) {
					this.tabindexCache.set(child, child.getAttribute("tabindex"));
				}

				if (isHidden) {
					// Set tabindex to -1 if hidden
					child.setAttribute("tabindex", "-1");
				} else {
					// Restore original tabindex value or set to 0
					const originalTabindex = this.tabindexCache.get(child);
					child.setAttribute("tabindex", originalTabindex || "0");
				}
			});
		});
	},

	observeAriaHiddenChanges: function () {
		const observer = new MutationObserver((mutationsList) => {
			mutationsList.forEach((mutation) => {
				if (
					mutation.type === "attributes" &&
					mutation.attributeName === "aria-hidden"
				) {
					this.updateFocusableElements();
				}
			});
		});

		document.querySelectorAll("[aria-hidden]").forEach((element) => {
			observer.observe(element, {
				attributes: true,
				attributeFilter: ["aria-hidden"],
			});
		});
	},

	init: function () {
		this.updateFocusableElements();
		this.observeAriaHiddenChanges();
	},
};

const initFields = () => {
	const fields = `.c-field input[type="text"],
			.c-field input[type="email"],
			.c-field input[type="tel"],
			.c-field input[type="url"],
			.c-field input[type="password"],
			.c-field input[type="file"],
			.c-field textarea`;
	const updateState = (target) => {
		target.value
			? target.classList.add("is-contain-value")
			: target.classList.remove("is-contain-value");
	};

	on("body", "change", fields, (e) => {
		const target = e.target;
		updateState(target);
	});

	document.querySelectorAll(fields).forEach((el) => {
		updateState(el);
	});
};

const initWYSIWYG = () => {
	// iframe fit vids
	reframe(
		`.wysiwyg iframe[src*="vimeo.com"],
		.wysiwyg iframe[src*="youtube.com"],
		.wysiwyg-page iframe[src*="vimeo.com"],
		.wysiwyg-page iframe[src*="youtube.com"]`,
		"video-reframe"
	);

	// instagram aspect ratio
	instagramIframeInterval = setInterval(() => {
		const iframes = document.querySelectorAll(".wysiwyg .instagram-media");
		const iframesLoaded = document.querySelectorAll(
			".wysiwyg .instagram-media.is-loaded"
		);

		if (iframes.length == iframesLoaded.length) {
			clearInterval(instagramIframeInterval);
		}

		iframes.forEach((el) => {
			if (
				!el.classList.contains("is-loaded") &&
				parseInt(el.getAttribute("height")) > 0
			) {
				el.style.height = `${el.getAttribute("height")}px`;
				el.classList.add("is-loaded");
			}
		});
	}, 500);
};

const initPageTransition = () => {
	const getHrefType = (el) => {
		const href = el.href;
		const isInternalLink = href.startsWith("/") || href.includes(siteUrl);
		const isAnchorLink =
			href.startsWith("#") || href.split("#")[0] == location.href.split("#")[0];

		if (isAnchorLink) {
			return "anchor";
		} else if (isInternalLink) {
			return "internal";
		} else {
			return "external";
		}
	};

	// trigger internal link page transition
	on("body", "click", "a[href]", (e) => {
		const target = e.target.closest("a[href]");
		const isKeyPressed = e.shiftKey || e.ctrlKey || e.altKey || e.metaKey;
		const isNewTab = target == "_blank";

		target.blur();

		if (getHrefType(target) == "internal" && !isNewTab && !isKeyPressed) {
			e.preventDefault();

			// remove active overlays
			root.classList.remove(
				"is-header-sticky",
				"is-menu-active",
				"is-mobile-menu-active"
			);
			root.classList.add("is-leaving");

			location.href = target.href;
		}
	});

	// auto assign noopener and _blank to external links
	document.querySelectorAll("a[href]").forEach((el) => {
		if (getHrefType(el) == "external") {
			el.rel = "noopener";
			el.target = el.target || "_blank";
		}
	});
};

const loader = {
	// Adds a new loader to an element
	new: function (el) {
		const loader = document.createElement("div");
		loader.classList.add("c-loader");
		el.appendChild(loader);
	},
	updateLoader: function (loader, progress) {
		loader.dataset.progress = progress;
		loader.style.transform = `scaleX(${progress / 100})`;
	},
	// Update loader progress and animate progress bar
	updateProgress: function (el) {
		const loader = el.querySelector(".c-loader");

		if (!loader) {
			this.new(el);
			setTimeout(() => this.updateProgress(el), 1);
			return;
		}

		if (loader.dataset.intervalId) {
			clearInterval(parseInt(loader.dataset.intervalId));
		}

		if (!loader.dataset.progress) {
			this.updateLoader(loader, getRandomInt(10, 30));
		}

		const intervalId = setInterval(() => {
			const currentProgress = parseInt(loader.dataset.progress);
			const newProgress = currentProgress + getRandomInt(5, 10);
			const shouldComplete = newProgress >= 100;

			if (shouldComplete) {
				this.complete(el);
				clearInterval(intervalId);
			} else {
				this.updateLoader(loader, newProgress);
			}
		}, 1000);

		loader.dataset.intervalId = intervalId;
	},
	// Completes loader progress and hides loader
	complete: function (el) {
		const loader = el.querySelector(".c-loader");
		this.updateLoader(loader, 100);
		setTimeout(() => {
			this.updateLoader(loader, 101);
			if (loader.dataset.intervalId) {
				clearInterval(parseInt(loader.dataset.intervalId));
				delete loader.dataset.intervalId;
			}
		}, 400);
	},
	init: function () {
		this.new(root);
	},
};

// ***EXECUTE FUNCTIONS***
afterFooter.init();
ariaFocusManager.init();
loader.init();
initFields();
initPageTransition();

// "DOMContentLoaded" waits for plugins to be complete parsing and executing
window.addEventListener("DOMContentLoaded", () => {
	initWYSIWYG();
});
