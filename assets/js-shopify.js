// ***GLOBAL (SHOPIFY SPECIFIC)***
const global = {
	sanitizePrice: function (s) {
		function dotAndCommaSwitcher(match) {
			return match == "," ? "." : ",";
		}

		// currency formatting: https://help.shopify.com/en/manual/markets/pricing/currency-formatting
		if (siteMoneyFormat.includes("amount_with_comma_separator")) {
			return s.replaceAll(/\.|\,/g, dotAndCommaSwitcher);
		} else {
			return s;
		}
	},
	formatSplitPrice: function (price) {
		if (!price) return false;

		// account for commas and decimals
		// "$10,100.99 USD" => ['$', 10100.99, 'USD']
		const priceSanitized = this.sanitizePrice(price);
		const regex = /([^0-9]*)([0-9,]+[\\\\.\\\\,]?[0-9]*)([^0-9]*)/;
		const match = priceSanitized.match(regex);

		return {
			symbol: match[1],
			value: parseFloat(match[2].replace(/[\\\\,]/g, "")),
			currency: match[3],
		};
	},
	formatShopifyMoney: function (price) {
		const priceFixed = Number(price).toFixed(2);
		const value = siteMoneyFormat.includes("amount_with_comma_separator")
			? formatNumberEuro(priceFixed).replace(",00", "")
			: formatNumberCommas(priceFixed).replace(".00", "");

		return siteMoneyFormat.replace(/\{\{(.*?)\}\}/gs, value);
	},
};

// ***WYSIWYG (SHOPIFY SPECIFIC)***
const cWysiwygShopify = {
	init: function () {
		// shopify - add wysiwyg styling to policy text
		const shopifyPolicyBody = document.querySelector(".shopify-policy__body");
		shopifyPolicyBody?.firstElementChild.classList.add(
			"wysiwyg",
			"wysiwyg-page"
		);

		// shopify - remove meta information
		document
			.querySelectorAll(".wysiwyg meta[charset], .wysiwyg-page meta[charset]")
			.forEach((el) => el.remove());
	},
};

// ***ITEM VARIANTS***
const cItemVariants = {
	updateVariantPillCurrentSelection: function (variantSelector, value, label) {
		const variantGroup = variantSelector.closest(".js-variant-group");
		const selected = variantGroup.querySelector(".js-variant-pills-selected");

		if (selected) {
			selected.dataset.label = value;
			selected.dataset.labelCurrent = label;
		}
	},
	init: function () {
		on("body", "mouseover", ".js-variant-group .js-variant-selector", (e) => {
			const target = e.target.closest(".js-variant-selector");
			this.updateVariantPillCurrentSelection(
				target,
				target.value,
				target.dataset.label
			);
		});

		on("body", "mouseout", ".c-product-form .js-variant-selector", (e) => {
			const target = e.target.closest(".js-variant-selector");
			const isInput = target.tagName == "INPUT";
			const selection = document.querySelector(
				`[name="${target.name}"]${isInput ? ":checked" : ""}`
			);

			this.updateVariantPillCurrentSelection(
				target,
				"",
				selection ? selection.dataset.label : ""
			);
		});
	},
};

// ***ITEM SELLING PLAN***
const cItemSellingPlan = {
	init: function () {
		on(
			"body",
			"change",
			'.c-item-selling-plan input[type="radio"][name*="selling-plan-"]',
			(e) => {
				const target = e.target.closest(
					'input[type="radio"][name*="selling-plan-"]'
				);
				const sellingPlanComponent = target.closest(".c-item-selling-plan");
				const selector = sellingPlanComponent.querySelector(
					'[name="selling_plan"]'
				);

				// if subscription is not selected, set selling_plan selector to disabled
				selector.disabled = target.value == "subscription" ? false : true;
			}
		);
	},
};

// ***ITEM QUANTITY***
const cItemQuantity = {
	updateQuantity: function (itemQuantity, increase) {
		const input = itemQuantity.querySelector('input[name="quantity"]');
		const inputDecrease = itemQuantity.querySelector(
			'[data-trigger="decrease"]'
		);
		const inputIncrease = itemQuantity.querySelector(
			'[data-trigger="increase"]'
		);

		// update input
		const value = parseInt(input.value);
		const valueChange = increase
			? Math.min(1, parseInt(input.max) - value)
			: Math.max(-1, parseInt(input.min) - value);
		const newValue = value + (increase !== undefined ? valueChange : 0);
		const newValueFormatted =
			input.dataset.leadingZero == "true" ? formatPad(newValue) : newValue;

		// button disabled state
		inputDecrease.disabled = newValue <= input.min ? true : false;
		inputIncrease.disabled = newValue >= input.max ? true : false;

		// input value has changed!
		if (newValueFormatted != input.value) {
			input.value = newValueFormatted;

			const eventChange = new Event("change");
			input.dispatchEvent(eventChange);
		}
	},
	init: function () {
		on("body", "click", ".c-item-quantity [data-trigger]", (e) => {
			const target = e.target.closest("[data-trigger]");
			const itemQuantity = target.closest(".c-item-quantity");

			this.updateQuantity(itemQuantity, target.dataset.trigger == "increase");
		});
	},
};

// ***PRODUCT FORM***
const cProductForm = {
	updateVariantSpecificImage: function (selection) {
		if (!selection || !selection.variantTitle.length) return;

		const productHero = document.querySelector(".product-hero");
		const media = productHero.querySelectorAll(".js-product-media");
		const allVariants = productHero.querySelectorAll(".js-variant-selector");
		const isInput = allVariants[0].tagName == "INPUT";

		if (media.length == 0) return;

		// save all variants' values into a Set for faster lookup, storing either the inputs' value or the options' value depending on the selector
		let allVariantsValueSet = new Set();

		if (isInput) {
			allVariantsValueSet = new Set(
				Array.from(allVariants).map((variant) => formatHandleize(variant.value))
			);
		} else {
			allVariants.forEach((selector) => {
				selector.querySelectorAll("option").forEach((option) => {
					if (option.value !== null && option.value !== "") {
						allVariantsValueSet.add(formatHandleize(option.value));
					}
				});
			});
		}

		// handleize the selection.variantTitle array
		const selectionArray = selection.variantTitle.map((title) =>
			formatHandleize(title)
		);

		media.forEach((img) => {
			const imgVariantOptionSet = new Set(
				img.dataset.variantOption
					.split("/")
					.map((item) => formatHandleize(item))
			);

			// check if the media alt is not assigned to any of the variants
			if (
				!Array.from(imgVariantOptionSet).some((variantOption) =>
					allVariantsValueSet.has(variantOption)
				)
			) {
				img.classList.remove("is-hidden");
			} else {
				// check if media alt is one of the variants
				if (
					Array.from(imgVariantOptionSet).some((variantOption) =>
						selectionArray.includes(variantOption)
					)
				) {
					img.classList.remove("is-hidden");
				} else {
					img.classList.add("is-hidden");
				}
			}
		});

		// update the slider
		productHero
			.querySelector(".js-product-hero-slider-thumbnail:not(.is-hidden)")
			.click();
	},
	saveVariantSelection: function (form, selection, variantsJson) {
		const variantSelectors = form.querySelectorAll(".js-variant-selector");

		// save variantTitle
		variantSelectors.forEach((el) => {
			const isInput = el.tagName == "INPUT";
			const title = isInput ? (el.checked ? el.value : false) : el.value;

			if (title) {
				selection["variantTitle"].push(title);
			}
		});

		// save variantObject
		selection["variantIndex"] = variantsJson.findIndex((object) => {
			return object.title === selection["variantTitle"].join(" / ");
		});
		selection["variantObject"] = variantsJson[selection["variantIndex"]];
	},
	updatePrice: function (form, variantObject) {
		const priceComponents = form.querySelectorAll(".c-item-price");
		priceComponents.forEach((priceComponent) => {
			const priceAdj = parseFloat(priceComponent.dataset.regularPriceAdj) || 1;
			const priceRegular = priceComponent.querySelector(".js-price-regular");
			const variantPrice = variantObject.price;
			if (priceRegular) {
				const { value } = global.formatSplitPrice(variantPrice);
				const formattedPrice = global.formatShopifyMoney(value * priceAdj);
				priceRegular.innerText = formattedPrice;
			}

			const priceCompare = priceComponent.querySelector(".js-price-compare");
			if (priceCompare) {
				const variantComparePrice = variantObject.priceCompare;
				const { value } = global.formatSplitPrice(variantComparePrice);
				const formattedPrice = global.formatShopifyMoney(value);

				priceCompare.innerText =
					variantComparePrice && variantComparePrice != variantPrice
						? formattedPrice
						: "";
			}
		});
	},
	updateQuantity: function (form, variantObject) {
		const maxInventory = variantObject.inventory;
		const inputQuantity = form.querySelector('input[name="quantity"]');

		// set max inventory
		if (inputQuantity) inputQuantity.max = maxInventory;

		// prevent quantity from going over variant max inventory
		if (parseInt(inputQuantity.value) > maxInventory && maxInventory != 0) {
			inputQuantity.value = maxInventory;
		}

		// dispatch update event to quantity component
		const quantityComponent = form.querySelector(".c-item-quantity");
		cItemQuantity.updateQuantity(quantityComponent);
	},
	updateFormId: function (form, variantObject) {
		const inputId = form.querySelector('input[name="id"]');

		inputId.value = variantObject.id;
	},
	updateFormSubmitState: function (form, variantObject) {
		const formSubmit = form.querySelector(".js-form-submit");

		if (variantObject.inventory <= 0) {
			form.dataset.available = false;
			formSubmit.disabled = true;
		} else {
			form.dataset.available = true;
			formSubmit.disabled = false;
		}
	},
	updateUrl: function (variantObject) {
		window.history.replaceState({}, "", `?variant=${variantObject.id}`);
	},
	updateVariantDisabledState: function (formElement, variants) {
		const variantGroups = formElement.querySelectorAll(".js-variant-group");
		const inStockVariants = variants.filter((variant) => variant.inventory > 0);

		// disable if there's only one variant group
		if (variantGroups.length <= 1) return false;

		// Get an array of selected variant values for each variant group
		const selectedVariants = Array.from(variantGroups).map((variantGroup) => {
			const isInput = variantGroup.querySelector("input.js-variant-selector");
			const selection = variantGroup.querySelector(
				`.js-variant-selector${isInput ? ":checked" : ""}`
			);

			return selection && selection.value != "" ? selection.value : false;
		});

		if (selectedVariants.includes(false)) return false;

		// Loop through each variant group
		// & disable the unselected variant if the combination is not in stock
		Array.from(variantGroups).forEach((variantGroup, index) => {
			const isInput = variantGroup.querySelector("input.js-variant-selector");
			// Find all unselected variants in the group
			const unselectedVariants = variantGroup.querySelectorAll(
				`.js-variant-selector${
					!isInput ? " option:not(:checked)" : ":not(:checked)"
				}`
			);

			unselectedVariants.forEach((unselectedVariant) => {
				// Create a new array of variant values with the current unselected variant included
				const selectedVariantValues = [...selectedVariants];
				selectedVariantValues[index] = unselectedVariant.value;

				// Check if the combination of variant values is in stock
				const combinationInStock = inStockVariants.some((variant) => {
					const selectedVariantTitles = selectedVariantValues.join(" / ");
					// Check if the variant title matches the selected variant values
					return variant.title === selectedVariantTitles;
				});

				// Disable the unselected variant if the combination is not in stock
				unselectedVariant.disabled = !combinationInStock;

				// Update the text of the unselected variant to indicate if it is sold out
				if (unselectedVariant.tagName === "OPTION") {
					unselectedVariant.innerText = `${unselectedVariant.value}${
						combinationInStock ? "" : " - sold out"
					}`;
				}
			});
		});
	},
	initGiftCard: function (form) {
		const giftCardFields = form.querySelector(".js-gift-card-fields");

		if (giftCardFields) {
			const recipientDate = giftCardFields.querySelector(".js-recipient-date");
			const recipientEmail = giftCardFields.querySelector(
				".js-recipient-email"
			);
			const recipientName = giftCardFields.querySelector(".js-recipient-name");
			const recipientMessage = giftCardFields.querySelector(
				".js-recipient-message"
			);

			on("body", "click", ".js-gift-card-toggle", (e) => {
				if (e.target.checked) {
					// display gift card fields and add email requirement
					giftCardFields.classList.add("is-active");
					recipientEmail.required = true;
				} else {
					// hide gift card fields and reset all input fields when toggled off
					giftCardFields.classList.remove("is-active");
					recipientEmail.required = false;
					recipientEmail.value = null;
					recipientDate.value = null;
					recipientMessage.value = null;
					recipientName.value = null;
				}
			});

			// convert date from Date object to YYYY-MM-DD format
			const convertDateFormat = (date) => {
				let dd = date.getDate();
				let mm = date.getMonth() + 1; // January is 0
				let yyyy = date.getFullYear();
				if (dd < 10) {
					dd = "0" + dd;
				}
				if (mm < 10) {
					mm = "0" + mm;
				}
				return yyyy + "-" + mm + "-" + dd;
			};

			// Send on must be within 90 days from now
			// https://shopify.dev/docs/themes/product-merchandising/gift-cards#limitations
			const maxDateRange = 90;
			let today = new Date();
			let maxDate = new Date();
			maxDate = new Date(maxDate.setDate(maxDate.getDate() + maxDateRange));

			today = convertDateFormat(today);
			maxDate = convertDateFormat(maxDate);

			recipientDate.setAttribute("min", today);
			recipientDate.setAttribute("max", maxDate);

			// check for date validity upon input
			on("body", "input", ".js-recipient-date", (e) => {
				const validityState = recipientDate.validity;

				if (validityState.rangeUnderflow) {
					recipientDate.setCustomValidity("Date must be today or later.");
				} else if (validityState.rangeOverflow) {
					recipientDate.setCustomValidity(
						"Date must be within 90 days from today."
					);
				}
			});
		}
	},
	init: function () {
		document.querySelectorAll(".c-product-form").forEach((form) => {
			if (!form.dataset.variantsJson) return false;
			const variantsJson = validateJson(
				form.dataset.variantsJson.replace(/'/g, '"').trim()
			);

			if (form.dataset.updateVariantDisabledState == "true") {
				this.updateVariantDisabledState(form, variantsJson);
			}

			// get preselected variants. if no variant is selected, only show the generic media
			const selection = {
				selectorIndex: null,
				variantTitle: [],
				variantIndex: null,
				variantObject: null,
			};
			this.saveVariantSelection(form, selection, variantsJson);

			if (!selection.variantTitle.length) {
				this.updateVariantSpecificImage({ variantTitle: [""] });
			} else {
				this.updateVariantSpecificImage(selection);
			}

			this.initGiftCard(form);
		});

		on("body", "change", ".c-product-form .js-variant-selector", (e) => {
			const target = e.target.closest(".js-variant-selector");
			const form = target.closest(".c-product-form");
			const variantsJson = validateJson(
				form.dataset.variantsJson.replace(/'/g, '"').trim()
			);
			const selection = {
				selectorIndex: null,
				variantTitle: [],
				variantIndex: null,
				variantObject: null,
			};

			// save selection in object
			if (form && variantsJson) {
				this.saveVariantSelection(form, selection, variantsJson);
			}

			// update variant-specific images
			this.updateVariantSpecificImage(selection);

			// trigger updates based on selected variant
			const selectedVariant = selection["variantObject"];
			if (form && selectedVariant) {
				this.updatePrice(form, selectedVariant);
				this.updateQuantity(form, selectedVariant);
				this.updateFormId(form, selectedVariant);
				this.updateFormSubmitState(form, selectedVariant);

				if (form.dataset.updateVariantUrl == "true") {
					this.updateUrl(selectedVariant);
				}

				if (form.dataset.updateVariantDisabledState == "true") {
					this.updateVariantDisabledState(form, variantsJson);
				}
			}
		});
	},
};

// ***CART***
const cCart = {
	// *** cart level updates ***
	updateCartStats: function () {
		fetch("/cart.js")
			.then((response) => {
				return response.json();
			})
			.then((data) => {
				const itemCount = data.item_count;

				document.querySelectorAll(".js-cart-item-count").forEach((el) => {
					el.innerText = itemCount;
				});

				itemCount > 0
					? root.classList.remove("is-cart-empty")
					: root.classList.add("is-cart-empty");

				document
					.querySelectorAll(".c-cart")
					.forEach((el) => el.setAttribute("data-item-count", itemCount));

				// update cart total
				const cartPrice = data.total_price / 100;
				const cartPriceFormatted = `${formatNumberCommas(
					cartPrice.toFixed(2)
				).replace(".00", "")}`;

				document.querySelectorAll(".js-cart-total-price").forEach((el) => {
					el.innerText = `$${cartPriceFormatted}`;
				});

				// free shipping
				const freeshipping = document.querySelector(
					".js-freeshipping-threshold"
				);
				if (freeshipping) {
					const newPrice = parseFloat(data.total_price / 100);
					this.updateFreeShipping(newPrice, freeshipping);
				}
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	},
	updateCartContent: function () {
		const carts = document.querySelectorAll(".c-cart");
		carts.forEach((el) => el.classList.add("is-content-updating"));
		this.updateCartStats();

		fetch("/cart")
			.then((response) => {
				return response.text();
			})
			.then((data) => {
				const dataHtml = parseHtmlString(data);

				// insert the cart content
				carts.forEach((el) => {
					el.innerHTML = dataHtml.querySelector(".c-cart").innerHTML;
					el.classList.remove("is-content-updating");
				});

				// re-init line items
				this.initLineItem();

				// re-init upsell
				this.initUpsell();
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	},

	// *** line item level actions ***
	getLineItem: function (el) {
		const item = el.closest(".c-line-item");
		const key = item.dataset.itemKey;

		const object = {
			item: item,
			key: key,
		};

		return object;
	},
	getItemData: function (el) {
		const id = el.querySelector('[name="id"]').value;
		const quantity = el.querySelector('[name="quantity"]')?.value || 1;
		const inputSellingPlan = el.querySelector(
			'[name="selling_plan"]:not(:disabled)'
		);
		const sellingPlan = inputSellingPlan ? inputSellingPlan.value : null;
		const properties = {};

		el.querySelectorAll('[name*="properties["]').forEach((el) => {
			const propertyName = el.name.match(/\[(.*?)\]/)[1];
			if (el.value) properties[propertyName] = el.value;
		});

		const object = {
			id: id,
			quantity: quantity,
			selling_plan: sellingPlan,
			properties: properties,
		};

		return object;
	},
	addItems: function ({
		items,
		updateCartContent = true,
		updateCartStats = false,
		callback,
	}) {
		fetch("/cart/add.js", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				items: items,
			}),
		})
			.then((response) => {
				return response;
			})
			.then(() => {
				if (updateCartContent) this?.updateCartContent();
				if (updateCartStats) this?.updateCartStats();
				if (callback) callback();
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	},
	updateLineItems: function ({
		items,
		updateCartContent = false,
		updateCartStats = true,
		callback,
	}) {
		fetch("/cart/update.js", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				updates: items,
			}),
		})
			.then((response) => {
				response.json();
			})
			.then(() => {
				if (updateCartContent) this?.updateCartContent();
				if (updateCartStats) this?.updateCartStats();
				if (callback) callback();
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	},

	// *** line item level updates ***
	isLineItemEventAttached: false,
	initLineItem: function (e) {
		const getItemKeyWithQuantity = (itemKey, quantity) => {
			const items = {};
			items[itemKey] = quantity;

			return items;
		};

		const updateInfo = (lineItem, variantObject) => {
			cProductForm.updatePrice(lineItem, variantObject);
			cProductForm.updateQuantity(lineItem, variantObject);
			cProductForm.updateFormId(lineItem, variantObject);

			const thumb = lineItem.querySelector(".js-item-thumb img");
			if (variantObject.imageSrc && thumb) {
				thumb.src = variantObject.imageSrc;
				thumb.srcset = "";
			}
		};

		// quantity change
		const itemQuantity = document.querySelectorAll(
			'.c-line-item input[name="quantity"]'
		);
		itemQuantity.forEach((el) => {
			el.addEventListener("change", (e) => {
				const target = e.target.closest('input[name="quantity"]');
				const quantity = parseInt(target.value) || 1;
				const { key } = this.getLineItem(e.target);
				const items = getItemKeyWithQuantity(key, quantity);

				this.updateLineItems({
					items: items,
				});
			});
		});

		if (this.isLineItemEventAttached) return;
		this.isLineItemEventAttached = true;

		// remove item
		on("body", "click", ".c-line-item .js-item-remove-trigger", (e) => {
			const { item, key } = this.getLineItem(e.target);
			const items = getItemKeyWithQuantity(key, 0);

			this.updateLineItems({
				items: items,
			});
			item.classList.add("is-removed");

			this.restoreUpsellItem(item);
		});

		// change variant
		on("body", "change", ".c-line-item .js-variant-selector", (e) => {
			const target = e.target.closest(".js-variant-selector");
			const { item, key } = this.getLineItem(target);

			item.classList.add("is-variant-updating");
			loader.updateProgress(root);

			// find variant object
			const isInput = target.tagName == "INPUT";
			const variantId = isInput
				? target.checked
					? target.value
					: false
				: target.value;
			const variantsJson = validateJson(
				item.dataset.variantsJson.replace(/'/g, '"').trim()
			);
			const variantIndex = variantsJson.findIndex((object) => {
				return object.id === variantId;
			});
			const variantObject = variantsJson[variantIndex];

			// add item
			const itemData = this.getItemData(item);
			itemData["id"] = variantObject["id"];

			// if current quantity exceeds inventory
			if (parseInt(itemData["quantity"]) > variantObject["inventory"]) {
				// set quantity to inventory
				itemData["quantity"] = variantObject["inventory"];
			}

			const handleAddItemsCallback = () => {
				// when new item is added, remove current item
				const items = getItemKeyWithQuantity(key, 0);

				this.updateLineItems({
					items: items,
					callback: handleUpdateLineItemsCallback,
				});
			};

			const handleUpdateLineItemsCallback = () => {
				// update item info
				fetch("/cart")
					.then((response) => {
						return response.text();
					})
					.then((data) => {
						const dataHtml = parseHtmlString(data);
						const newLineItemKey = dataHtml.querySelector(
							".c-cart .c-line-item:first-child"
						).dataset.itemKey;

						// update item key
						item.dataset.itemKey = newLineItemKey;
						// update item UI
						updateInfo(item, variantObject);
						// remove updating state
						item.classList.remove("is-variant-updating");
						loader.complete(root);
					})
					.catch((error) => {
						console.error("Error:", error);
					});
			};

			this.addItems({
				items: [itemData],
				updateCartContent: false,
				updateCartStats: false,
				callback: handleAddItemsCallback,
			});
		});
	},

	// *** cart options ***
	updateCartNote: function (note) {
		fetch("/cart/update.js", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				note,
			}),
		})
			.then((response) => {
				return response.json();
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	},
	updateGiftWrap: function (cartAttributes = {}) {
		fetch("/cart/update.js", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				attributes: cartAttributes,
			}),
		})
			.then((response) => {
				return response.json();
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	},
	updateDiscount: function (discountCode) {
		disableAllCartInputs(true);
		fetch(`/discount/${discountCode}`)
			.then(() => fetch("/cart"))
			.then((response) => response.text())
			.then(updateCartContent) // TODO: update success message with toast component
			.catch((error) => {
				console.error("Error:", error);
			})
			.finally(() => {
				disableAllCartInputs(false);
			});

		// help functions for updateDiscount
		function disableAllCartInputs(disable) {
			const gMinicartContent = document.querySelector(".g-minicart__content");
			[
				...gMinicartContent.querySelectorAll("button"),
				...gMinicartContent.querySelectorAll("input"),
			].forEach((el) =>
				disable
					? el.setAttribute("disabled", "disabled")
					: el.removeAttribute("disabled")
			);
		}
		function updateCartContent(data) {
			const parser = new DOMParser();
			const dataHtml = parser.parseFromString(data, "text/html");

			const originalCartEl = document.querySelector(".c-cart");
			const newCartEl = dataHtml.querySelector(".c-cart");

			// Only update the text content, so there's no need to reinitialize all functions
			const updateElements = (selector) => {
				const originalEls = originalCartEl.querySelectorAll(selector);
				const newEls = newCartEl.querySelectorAll(selector);
				if (originalEls.length > 0 && newEls.length > 0) {
					originalEls.forEach((el, i) => (el.innerHTML = newEls[i].innerHTML));
				}
			};
			updateElements(".js-line-item-price");
			updateElements(".js-cart-total-price");
			updateCartDiscountContent(originalCartEl, newCartEl);
		}
		function updateCartDiscountContent(originalCartEl, newCartEl) {
			const cartDiscountSuccessEl = newCartEl.querySelector(
				".js-cart-discount-success"
			);
			const originalDiscountForm =
				originalCartEl.querySelector(".js-cart-discount");
			const successMessage = originalDiscountForm.dataset.success; // TODO: update success message with toast component
			const errorMessage = originalDiscountForm.dataset.error;

			if (cartDiscountSuccessEl && originalDiscountForm) {
				originalDiscountForm.outerHTML = cartDiscountSuccessEl.outerHTML;
			} else if (!cartDiscountSuccessEl && originalDiscountForm) {
				const discountInput = originalDiscountForm.querySelector(
					".js-cart-discount-input"
				);
				discountInput.value = "";
				discountInput.placeholder = errorMessage;
			}
		}
	},

	// *** upsell ***
	isUpsellInit: false, // Avoid storing upsell items repeatedly
	upsellProductHandles: [], // Stores all upsell product handles; when a user removes an upsell item, it will be re-added to the upsell list
	initUpsell: async function () {
		// if there's no upsell element, means that upsell is disabled
		const upsell = document.querySelector(".js-upsell");
		if (!upsell) return;

		// If there's no upsell item list, create it
		const upsellItemList = document.querySelector(".js-upsell-item-list");
		if (upsellItemList.querySelector(".js-upsell-item-form") == null)
			await this.createUpsell(upsellItemList);

		// If an item is in the cart, don’t show it in the upsell list
		const filteredUpsellItems = this.filterUpsellItems();

		if (!this.isUpsellInit) {
			this.isUpsellInit = true;
			this.storeUpsellProducts();
			this.activeUpsellNavigation(upsell);
		}

		// When everything is ready, fade in the upsell
		// This ensures layout stability and fade in animation
		this.toggleUpsellVisibility(filteredUpsellItems);
	},
	// upsell -> create upsell
	createUpsell: async function (upsellItemList) {
		const allLineItems = [...document.querySelectorAll(".js-line-item")];
		const allLineItemsIds = allLineItems?.map((item) =>
			item.getAttribute("data-product-id")
		);

		if (allLineItemsIds.length === 0) {
			document.querySelector(".js-upsell").classList.add("is-no-upsell-items");
			return;
		}

		const upsellItems = await this.fetchUpsellItems(allLineItemsIds);

		if (upsellItems.length === 0) return;
		const upsellItemCards = this.createUpsellItemCards(upsellItems);

		upsellItemCards?.forEach((card) => {
			upsellItemList?.appendChild(card);
		});
		this.storeUpsellProducts();

		this.createUpsellDots(upsellItemCards.length);

		return upsellItems;
	},
	fetchUpsellItems: async function (allLineItemsIds) {
		if (allLineItemsIds.length === 0) return [];

		const upsellItemsArr = await Promise.all(
			allLineItemsIds.map(async (id) => {
				const response = await fetch(
					window.Shopify.routes.root +
						`recommendations/products.json?product_id=${id}&intent=related`
				);
				const data = await response.json();

				const availableProducts = data.products.filter(
					(product) =>
						product.available && !allLineItemsIds.includes(product.id)
				);

				return [...availableProducts];
			})
		);
		const uniqueItems = upsellItemsArr
			.flat()
			.filter(
				(item, index, self) => index === self.findIndex((t) => t.id === item.id)
			);

		return uniqueItems;
	},
	toggleUpsellVisibility: function (upsellItems) {
		const upsell = document.querySelector(".js-upsell");
		if (!upsell) return;

		upsell.classList.toggle("has-upsell-items", upsellItems?.length > 0);
		upsell.classList.toggle(
			"is-only-one-upsell-item",
			upsellItems?.length === 1
		);
	},
	createUpsellItemCards: function (upsellItems) {
		return upsellItems.map((item, index) => {
			const variant = item.variants.find((variant) => variant.available);
			const htmlString = /* html */ `
				<form
					class="c-upsell-item c-product-form js-upsell-item-form ${
						index === 0 && "is-active"
					}"
					action="/cart/add"
					method="post"
					data-product-id="${variant.id}"
					data-product-handle="${item.handle}"
				>
					<p class="c-upsell-item__header">
						You may like this
					</p>

					<div class="c-upsell-item__item f-h f-a-s">
						<div class="c-upsell-item__thumb">
							<a
								href="${item.url}"
								class="object-fit bg-subtle"
								title="${item.title}"
							>
								${
									item.featured_image
										? `<img src="${
												window.Shopify.routes.root + item.featured_image
										  }">`
										: ""
								}
							</a>
						</div>

						<div class="c-upsell-item__info f-v">
							<div class="c-upsell-item__title">
								${variant.name}
							</div>

							<div class="c-upsell-item__price">
								$${variant.price / 100}
							</div>

							<button
								type="submit"
								class="c-upsell-item__add btn-underline js-form-submit"
								aria-label="Add item to cart"
							>
								Add to cart
							</button>

							<input type="hidden" name="id" value="${variant.id}">

							<input
								type="hidden"
								name="properties[_upsell]"
								value="true"
							>
						</div>
					</div>
				</form>
			`;

			const cardWrapper = document.createElement("div");
			cardWrapper.innerHTML = htmlString;
			return cardWrapper.firstElementChild;
		});
	},
	createUpsellDots(number) {
		const dotGroup = document.querySelector(".js-upsell-dot-group");
		if (number <= 1 || !dotGroup) return;

		Array.from({ length: number }).forEach((_, index) => {
			const dot = document.createElement("button");
			dot.classList = `c-cart__upsell__dot js-upsell-dot ${
				index === 0 ? "is-active" : ""
			}`;
			dotGroup.appendChild(dot);
		});
	},
	// upsell -> active navigation
	activeUpsellNavigation: function (upsell) {
		const arrowNavigation = upsell.querySelector(".js-upsell-arrow");
		const dotsNavigation = upsell.querySelector(".js-upsell-dot-group");

		if (arrowNavigation) this.activeUpsellArrowNav();
		else if (dotsNavigation) this.activeUpsellDotsNav();
	},
	activeUpsellArrowNav: function () {
		let index = 0;
		const toggleItemsActive = (upsellItems, currentIndex) =>
			upsellItems.forEach((item, index) =>
				item.classList.toggle("is-active", index === currentIndex)
			);

		on("body", "click", ".js-upsell-arrow-left", () => {
			const upsellItems = document.querySelectorAll(".js-upsell-item-form");

			index--;
			if (index < 0) index = upsellItems?.length - 1;
			toggleItemsActive(upsellItems, index);
		});
		on("body", "click", ".js-upsell-arrow-right", () => {
			const upsellItems = document.querySelectorAll(".js-upsell-item-form");

			index++;
			if (index > upsellItems?.length - 1) index = 0;
			toggleItemsActive(upsellItems, index);
		});
	},
	activeUpsellDotsNav: function () {
		on("body", "click", ".js-upsell-dot", (e) => {
			const upsellItems = document.querySelectorAll(".js-upsell-item-form");
			upsellItems.forEach((item) => item.classList.remove("is-active"));

			const currentDot = e.target.closest(".js-upsell-dot");
			const allDots = Array.from(currentDot.parentNode.children);
			allDots.forEach((dot) => dot.classList.remove("is-active"));
			currentDot.classList.add("is-active");

			const currentIndex = allDots.indexOf(currentDot);
			upsellItems[currentIndex]?.classList.add("is-active");
		});
	},
	// upsell -> filter existing items
	filterUpsellItems: function () {
		const cartLineItems = [...document.querySelectorAll(".js-line-item")];
		const upsellItems = [...document.querySelectorAll(".js-upsell-item-form")];

		// if cart is empty or client does not have specific upsell, return
		if (cartLineItems.length == 0 || upsellItems.length == 0) return;

		const needRemoveUpsellItems = upsellItems.filter((upsellItem) =>
			cartLineItems.find(
				(cartItem) =>
					upsellItem.getAttribute("data-product-handle") ==
					cartItem.getAttribute("data-product-handle")
			)
		);
		needRemoveUpsellItems.forEach((item) => item.remove());

		const remainUpsellItems = document.querySelectorAll(".js-upsell-item-form");
		remainUpsellItems[0]?.classList.add("is-active");

		// clear all upsell dots and recreate
		const dotGroup = document.querySelector(".js-upsell-dot-group");
		if (dotGroup) {
			dotGroup.innerHTML = "";
			this.createUpsellDots(remainUpsellItems.length);
		}

		return remainUpsellItems;
	},
	// upsell -> put the item back to upsell list when it is removed from cart
	restoreUpsellItem: function (item) {
		if (document.querySelector(".js-upsell") == null) return;

		const itemHandle = item.getAttribute("data-product-handle");
		if (this.upsellProductHandles.includes(itemHandle) == false) return;

		fetch(window.Shopify.routes.root + `products/${itemHandle}.js`)
			.then((response) => response.json())
			.then((product) => {
				// create new upsell item card and append to upsell item list
				const upsellItemCard = this.createUpsellItemCards([product])[0];
				const upsellItemList = document.querySelector(".js-upsell-item-list");
				upsellItemList
					.querySelectorAll(".js-upsell-item-form")
					.forEach((item) => item.classList.remove("is-active"));
				upsellItemList.insertBefore(upsellItemCard, upsellItemList.firstChild);

				// create new dot group
				const dotGroup = document.querySelector(".js-upsell-dot-group");
				if (dotGroup) {
					dotGroup.innerHTML = ""; // remove all children
					const upsellItemsCount = document.querySelectorAll(
						".js-upsell-item-form"
					).length;
					this.createUpsellDots(upsellItemsCount);
				}

				const upsellItems = document.querySelectorAll(".js-upsell-item-form");
				this.toggleUpsellVisibility(upsellItems);
			});
	},
	// upsell -> store upsell products
	storeUpsellProducts: function () {
		if (this.upsellProductHandles.length > 0) return;
		this.upsellProductHandles = [
			...document.querySelectorAll(".js-upsell-item-form"),
		].map((item) => item.getAttribute("data-product-handle"));
	},

	// *** free shipping ***
	updateFreeShipping: function (newPrice, freeshipping) {
		const threshold = parseFloat(freeshipping.dataset.freeshippingThreshold);
		const progressBar = freeshipping.querySelector(
			".js-freeshipping-progress-bar"
		);
		const diff = freeshipping.querySelector(".js-freeshipping-diff");

		// update free shipping messages
		freeshipping.classList.toggle("is-freeshipping", newPrice >= threshold);
		const diffValue = threshold - newPrice;
		const diffValueWithCurrency = global.formatShopifyMoney(diffValue);
		const diffValueWithoutCurrency = diffValueWithCurrency
			.replace(".00", "")
			.replace(/[^$\d,\.]/g, "");
		diff.innerHTML = diffValueWithoutCurrency;

		// update free shipping progress bar
		progressBar.style.width =
			newPrice > threshold
				? "100%"
				: `${((newPrice / threshold) * 100).toFixed(0)}%`;
	},

	// minicart active

	// minicart
	getMinicartDom: function () {
		return document.querySelector(".g-minicart");
	},
	minicartClose: function () {
		root.classList.remove("is-minicart-active");
		history.replaceState(null, null, " ");
		scrollEnable();
		this.getMinicartDom()?.setAttribute("aria-hidden", "true");
	},
	minicartOpen: function () {
		root.classList.add("is-minicart-active");
		history.replaceState(null, null, "#cart");
		scrollDisable();
		this.getMinicartDom()?.setAttribute("aria-hidden", "false");
		this.updateAriaHiddenInCart();
	},
	initMinicart: function () {
		this.getMinicartDom()?.setAttribute("aria-hidden", "true");

		on("body", "click", ".js-minicart-close", this.minicartClose.bind(this));
		on("body", "click", ".js-minicart-open", this.minicartOpen.bind(this));

		on("body", "click", ".js-minicart-toggle", (e) => {
			root.classList.contains("is-minicart-active")
				? this.minicartClose()
				: this.minicartOpen();
		});

		on("body", "keydown", "body", (e) => {
			if (e.key == "Escape") {
				this.minicartClose();
			}
		});

		// trigger cart if url contains the hash
		if (location.hash == "#cart") this.minicartOpen();
	},

	// accessibility updates
	updateAriaHiddenInCart: function (isHidden = false) {
		const cartDoms = document.querySelectorAll(".c-cart");
		cartDoms.forEach((cartDom) => {
			const itemCount = parseInt(cartDom.dataset?.itemCount, 10) || 0;
			const cartEmpty = cartDom.querySelector(".js-cart-empty");
			const cartWrapper = cartDom.querySelector(".js-cart-wrapper");

			if (isHidden) {
				cartEmpty.setAttribute("aria-hidden", "true");
				cartWrapper.setAttribute("aria-hidden", "true");
			} else {
				cartEmpty.setAttribute("aria-hidden", itemCount > 0);
				cartWrapper.setAttribute("aria-hidden", itemCount <= 0);
			}
		});
	},
	updateFocusableElementsInCart: function (cartDom, itemCount) {
		if (!cartDom) return;

		cartDom
			.querySelector(".js-cart-empty")
			.setAttribute("aria-hidden", itemCount > 0);
		cartDom
			.querySelector(".js-cart-wrapper")
			.setAttribute("aria-hidden", itemCount <= 0);
	},
	observeAriaHiddenChanges: function () {
		const minicart = this.getMinicartDom();
		if (!minicart) return;

		const minicartObserver = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (
					mutation.type === "attributes" &&
					mutation.attributeName === "aria-hidden"
				) {
					const isHidden = minicart.getAttribute("aria-hidden") === "true";
					this.updateAriaHiddenInCart(isHidden);
				}
			});
		});

		minicartObserver.observe(minicart, {
			attributes: true,
			attributeFilter: ["aria-hidden"],
		});
	},

	// init
	init: function () {
		// product form submissions
		on("body", "submit", 'form[action="/cart/add"]', (e) => {
			e.preventDefault();

			const form = e.target.closest('form[action="/cart/add"]');

			const item = this.getItemData(form);

			loader.updateProgress(root);
			this.addItems({
				items: [item],
				callback: () => {
					loader.complete(root);
					this.minicartOpen();
				},
			});
		});

		// update tabindex attributes
		this.observeAriaHiddenChanges();

		// add Cart Note
		on("body", "change", ".js-cart-note-text", (e) => {
			const cartNoteCheckout = document.querySelector(".js-cart-note-checkbox");
			const cartNoteText = e.target.value;
			if (!cartNoteText || !cartNoteCheckout.checked) return;

			this.updateCartNote(cartNoteText);
		});
		on("body", "change", ".js-cart-note-checkbox", (e) => {
			const cartNote = document.querySelector(".js-cart-note-text");
			if (e.target.checked) {
				cartNote.classList.add("is-active");
				this.updateCartNote(cartNote.value);
			} else {
				cartNote.classList.remove("is-active");
				this.updateCartNote("");
			}
		});

		// toggle Gift Wrap
		on("body", "change", ".js-cart-gift-wrap-checkbox", (e) => {
			const target = e.target.closest(".js-cart-gift-wrap-checkbox");
			const attributes = target.checked
				? { "Gift wrap": "Yes" }
				: { "Gift wrap": "No" };
			this.updateGiftWrap(attributes);
		});

		// code discount
		on("body", "submit", ".js-cart-discount", (e) => {
			e.preventDefault();
			const discountCode = e.target.querySelector(
				".js-cart-discount-input"
			).value;
			this.updateDiscount(discountCode);
		});

		this.initLineItem();
		this.initUpsell();

		// initialize minicart
		this.initMinicart();
	},
};

// ***INFINITE SCROLL***
const cInfiniteScroll = {
	createNewInfiniteScroll(el) {
		let id = el.dataset.infiniteScrollId;
		let infiniteScrollInstance = InfiniteScroll.data(
			`.js-infinite-scroll-grid-${id}`
		);

		if (infiniteScrollInstance) infiniteScrollInstance.destroy();

		return new InfiniteScroll(`.js-infinite-scroll-grid-${id}`, {
			path: `.js-infinite-scroll-next-${id}`,
			append: `.js-infinite-scroll-item-${id}`,
			button: `.js-load-more-btn-${id}`,
			scrollThreshold: false,
			history: false,
		});
	},

	computeProgressBarWidth(viewedCount, maxItemCount) {
		const progressBarElement = document.querySelector(".js-progress-bar");
		if (progressBarElement)
			progressBarElement.style.width = `${Math.round(
				(viewedCount / maxItemCount) * 100
			)}%`;
	},

	computeCount(el) {
		const pagination = el.querySelector(".js-pagination");
		const maxItemCount = parseInt(pagination.dataset.itemCount);
		const paginateCount = parseInt(pagination.dataset.paginateCount);

		return { maxItemCount, paginateCount };
	},

	init() {
		// if there is no pagination, show full progress bar
		if (!document.querySelector('[class^="js-infinite-scroll-next-"]')) {
			cInfiniteScroll.computeProgressBarWidth(1, 1); // 100%
			return;
		}

		document.querySelectorAll(".js-infinite-scroll").forEach((el) => {
			// destroy infinite scroll instance if one already exists
			let infiniteScroll = cInfiniteScroll.createNewInfiniteScroll(el);
			let message = el.querySelector(".c-pagination__end-message");

			// init count
			const { maxItemCount, paginateCount } = cInfiniteScroll.computeCount(el);
			let viewedCount = paginateCount;

			// init progress bar width
			cInfiniteScroll.computeProgressBarWidth(viewedCount, maxItemCount);

			infiniteScroll.on("request", () => {
				loader.updateProgress(root);
			});

			infiniteScroll.on("append", () => {
				loader.complete(root);
				viewedCount = Math.min(viewedCount + paginateCount, maxItemCount);

				// update viewed count
				const viewedCountElement = el.querySelector(".js-viewed-count");
				viewedCountElement.innerText = viewedCount;

				// compute new progress bar width
				cInfiniteScroll.computeProgressBarWidth(viewedCount, maxItemCount);

				if (viewedCount == maxItemCount) {
					const wrapper = el.querySelector(".js-pagination");
					wrapper.classList.add("is-max-items");
				}
			});

			infiniteScroll.on("error", () => {
				loader.complete(root);
			});

			infiniteScroll.on("last", () => {
				loader.complete(root);
			});
		});
	},
};

// ***FILTERS & SORTING***
const cFiltersSort = {
	getPriceRangeSelections: function (target) {
		const selections = [];
		const component = target.closest(".c-filters-sort");

		component.querySelectorAll('input[type="number"]').forEach((el) => {
			if (el.value) {
				selections.push({
					name: el.name,
					value: el.value,
				});
			}
		});

		return selections;
	},
	getFiltersSelection: function (target) {
		const selections = [];
		const component = target.closest(".c-filters-sort");

		component
			.querySelectorAll('input[type="checkbox"]:checked')
			.forEach((el) => {
				if (el.value) {
					selections.push({
						name: el.name,
						value: el.value,
					});
				}
			});

		return selections;
	},
	getSortSelection: function (target) {
		const component = target.closest(".c-filters-sort");
		const sort = component.querySelector("select");

		return sort && sort.value != "manual" ? sort.value : false;
	},
	getFilterSortUrl: function (target) {
		// Get price range selection and create filter string
		// filter.v.price.gte=10&filter.v.price.lte=20
		const priceRangeSelections = this.getPriceRangeSelections(target);
		const priceRangeString = priceRangeSelections
			.map((el) => `${el.name}=${el.value}`)
			.join("&");

		// Get filter selections and create filter string
		const filterSelections = this.getFiltersSelection(target);
		const filterString = filterSelections
			.map((el) => `${el.name}=${el.value}`)
			.join("&");

		// Get sort selection and create sort string
		const sortSelection = this.getSortSelection(target);
		const sortString = sortSelection ? `sort_by=${sortSelection}` : false;

		// Combine filter and sort strings into a single encoded URL string
		const filtersSortArray = [];
		if (priceRangeString) filtersSortArray.push(priceRangeString);
		if (filterString) filtersSortArray.push(filterString);
		if (sortString) filtersSortArray.push(sortString);
		const filtersSortUrl = encodeURI(filtersSortArray.join("&"));

		// Return URL
		return filtersSortUrl;
	},
	updateFilterSort: function ({
		urlParamString,
		elTarget,
		replaceState,
		reinitPanel = false,
	}) {
		loader.updateProgress(root);
		root.classList.add("is-filters-sort-updating");

		// get existing url parameters (excluding 'filter' and 'sort_by')
		const query = new URLSearchParams(window.location.search);
		const filteredQuery = new URLSearchParams();
		for (const [key, value] of query.entries()) {
			if (!key.includes("filter") && !key.includes("sort_by")) {
				filteredQuery.append(key, value);
			}
		}
		const filteredParams = Array.from(filteredQuery)
			.map((el) => `${el[0]}=${el[1]}`)
			.join("&");

		// reattach existing url parameters to the urlParam
		const urlParams = [filteredParams, urlParamString]
			.filter(Boolean)
			.join("&");
		const encodedUrlParams = encodeURI(urlParams);

		// fetch filtered/sorted content
		fetch(`?${encodedUrlParams}`)
			.then((response) => {
				return response.text();
			})
			.then((data) => {
				const dataHtml = parseHtmlString(data);

				// Get all the elements that need to be updated.
				const updateDataHtml = Array.from(
					dataHtml.querySelectorAll(".js-filters-sort-update")
				);

				// Update the HTML of the filters sort elements.
				const elDisableRefresh = elTarget
					? elTarget.closest(".js-filters-sort-update")
					: null;

				document
					.querySelectorAll(".js-filters-sort-update")
					.forEach((el, index) => {
						if (el != elDisableRefresh && updateDataHtml[index]) {
							el.innerHTML = updateDataHtml[index].innerHTML;
						}
					});

				// Update panel
				if (reinitPanel) {
					const panel = document.querySelector(".js-filters-sort-panel");
					this.panelUpdate(panel);
				}

				// update active filtering and sorting
				this.panelFilterSortUpdate();

				// Signal that the loading has completed and remove the updating class.
				loader.complete(root);
				root.classList.remove("is-filters-sort-updating");

				// re-init Infinite Scroll with new URL
				cInfiniteScroll.init();
			})
			.catch((error) => {
				console.error("Error:", error);
			});

		// Update URL without refreshing the page
		replaceState
			? window.history.replaceState({}, "", `?${encodedUrlParams}`)
			: window.history.pushState({}, "", `?${encodedUrlParams}`);
	},
	updateSortCurrent: function (selector) {
		const dropdown = selector.closest(".js-filters-sort-dropdown-sorting");

		if (dropdown) {
			dropdown.querySelector(".js-filter-dropdown-toggle").dataset.current =
				selector.value == "manual"
					? ""
					: `: ${selector.options[selector.selectedIndex].text}`;
		}
	},
	panelClose: function () {
		root.classList.remove("is-filters-sort-panel-active");
	},
	panelOpen: function () {
		root.classList.add("is-filters-sort-panel-active");
	},
	panelFilterSortUpdate: function () {
		const selections = document.querySelectorAll(
			".c-filters-sort__selection .js-filters-sort-update"
		);

		document
			.querySelectorAll(".js-filters-sort-panel-body .js-filters-sort-update")
			.forEach((el, index) => {
				el.innerHTML = selections[index].innerHTML;
			});

		document.querySelector(
			".c-filters-sort .js-filters-sort-panel-active"
		).innerHTML = document.querySelector(
			".c-filters-sort .js-filters-sort-active"
		).innerHTML;
	},
	panelUpdate: function (panel) {
		if (!panel) return false;
		const panelBody = panel.querySelector(".js-filters-sort-panel-body");
		panelBody.innerHTML = "";
		document
			.querySelectorAll(".c-filters-sort .js-filters-sort-dropdown")
			.forEach((el) => {
				const elClone = el.cloneNode(true);
				panelBody.appendChild(elClone);
			});

		panel.querySelectorAll(".js-filters-sort-dropdown").forEach((el) => {
			el.classList.remove("tablet-up-only");
			el.querySelectorAll("input").forEach((input) => {
				input.id = `panel-${input.id}`;
			});
			el.querySelectorAll("label").forEach((label) => {
				label.htmlFor = `panel-${label.htmlFor}`;
			});
		});
	},
	initPanel: function () {
		// construct HTML markup
		const panel = document.querySelector(".js-filters-sort-panel");
		const panelClone = panel.cloneNode(true);
		panelClone.classList.add("c-filters-sort");
		document.body.appendChild(panelClone);
		panel.remove();

		this.panelUpdate(panelClone);

		// update active filtering and sorting
		this.panelFilterSortUpdate();

		// open, close, and toggle actions
		on("body", "click", ".js-filters-sort-panel-close", this.panelClose);
		on("body", "click", ".js-filters-sort-panel-open", this.panelOpen);

		on("body", "click", ".js-filters-sort-panel-toggle", (e) => {
			root.classList.contains("is-filters-sort-panel-active")
				? this.panelClose()
				: this.panelOpen();
		});

		on("body", "keydown", "body", (e) => {
			if (e.key == "Escape") this.panelClose();
		});
	},
	init: function () {
		// init filters sort panel
		if (document.querySelector(".js-filters-sort-panel")) this.initPanel();

		// dropdown toggle
		on("body", "click", "body", (e) => {
			const target = e.target;
			const dropdownToggle = target.closest(".js-filter-dropdown-toggle");

			document.querySelectorAll(".js-filters-sort-dropdown").forEach((el) => {
				const toggle = el.querySelector(".js-filter-dropdown-toggle");

				dropdownToggle && dropdownToggle == toggle
					? el.classList.toggle("is-dropdown-active")
					: !target.closest(".js-filters-sort-dropdown-content")
					? el.classList.remove("is-dropdown-active")
					: "";
			});
		});

		// trigger filter or sorting events
		on("body", "change", ".js-filter-input", (e) => {
			this.updateFilterSort({
				urlParamString: this.getFilterSortUrl(e.target),
				target: e.target,
			});
		});
		on("body", "click", ".js-filter-apply", (e) => {
			this.updateFilterSort({
				urlParamString: this.getFilterSortUrl(e.target),
				target: e.target,
			});
		});
		on("body", "submit", ".js-filter-form", (e) => {
			e.preventDefault();
			this.updateFilterSort({
				urlParamString: this.getFilterSortUrl(e.target),
				target: e.target,
			});
		});
		on("body", "change", ".js-sort-selector", (e) => {
			const selector = e.target.closest("select");
			this.updateFilterSort({
				urlParamString: this.getFilterSortUrl(e.target),
				target: selector,
			});
			this.updateSortCurrent(selector);
		});

		// back and forward navigation
		window.addEventListener("popstate", (e) => {
			if (document.querySelector(".js-filter-form")) {
				this.updateFilterSort({
					urlParamString: location.search.replace("?", ""),
					replaceState: true,
				});
			}
		});

		// clear filters
		on("body", "click", ".js-filter-remove", (e) => {
			e.preventDefault();
			const target = e.target.closest(".js-filter-remove");
			const url = target.dataset.url;
			const urlParamString = url
				.replace(`${location.pathname}`, "")
				.replace("?", "");

			target.remove();
			this.updateFilterSort({
				urlParamString: urlParamString,
				elTarget: target,
				reinitPanel: true,
			});
		});

		on("body", "click", ".js-filter-remove-all", (e) => {
			e.preventDefault();
			this.updateFilterSort({ urlParamString: null, reinitPanel: true });
		});
	},
};

// ***ANNOUNCEMENT***
const gAnnouncement = {
	// Selecting the announcement elements
	announcement: document.querySelector(".g-announcement"),
	dots: document.querySelector(".g-announcement .js-announcement-dots"),

	// Disables autoplay of the announcement
	disableAutoplay: function () {
		this.announcement.classList.add("is-autoplay-disabled");
	},

	// Enables autoplay of the announcement
	enableAutoplay: function () {
		this.announcement.classList.remove("is-autoplay-disabled");
	},

	// Interval for autoplaying the announcement
	autoplayInterval: null,

	// Autoplays the announcement if autoplay is enabled
	autoplay: function () {
		if (!(this.dots && this.dots.dataset.autoplay)) return false;
		const dotsTrigger = this.dots.querySelectorAll(
			"[data-announcement-trigger]"
		);
		const autoplayInterval = parseInt(this.dots.dataset.autoplayInterval);

		// Disable/enable autoplay when the mouse is hovering over the announcement element
		on("body", "mouseover", ".g-announcement", () => {
			this.disableAutoplay();
		});

		on("body", "mouseout", ".g-announcement", () => {
			this.enableAutoplay();
		});

		// Autoplay the announcement
		this.autoplayInterval = setInterval(() => {
			if (this.announcement.classList.contains("is-autoplay-disabled")) {
				return false;
			}
			const activeDot = this.dots.querySelector(
				"[data-announcement-trigger].is-active"
			);
			const activeIndex = parseInt(activeDot.dataset.announcementTrigger);
			const newActiveIndex =
				activeIndex < dotsTrigger.length - 1 ? activeIndex + 1 : 0;

			this.updateActiveMessage(newActiveIndex);
		}, autoplayInterval * 1000);
	},

	// Updates the announcement height to match the active block
	updateAnnouncementHeight: function () {
		const activeBlock = this.announcement.querySelector(
			".js-announcement-block.is-active"
		);

		if (activeBlock) {
			this.announcement.querySelector(
				".js-announcement-blocks"
			).style.height = `${activeBlock.offsetHeight}px`;
		}

		root.style.setProperty(
			"--s-announcement-dynamic",
			`${this.announcement ? this.announcement.offsetHeight : 0}px`
		);
	},

	// Updates the active message
	updateActiveMessage: function (index) {
		this.announcement
			.querySelectorAll(".js-announcement-block")
			.forEach((el, i) => {
				i == index
					? el.classList.add("is-active")
					: el.classList.remove("is-active");
			});

		this.announcement
			.querySelectorAll("[data-announcement-trigger]")
			.forEach((el, i) => {
				i == index
					? el.classList.add("is-active")
					: el.classList.remove("is-active");
			});

		this.updateAnnouncementHeight();
	},
	init: function () {
		if (this.announcement && this.announcement.children.length > 0) {
			this.autoplay();
			this.updateAnnouncementHeight();

			// Update active message when clicked and stop autoplaying
			on("body", "click", "[data-announcement-trigger]", (e) => {
				const target = e.target.closest("[data-announcement-trigger]");
				const activeIndex = parseInt(target.dataset.announcementTrigger);

				this.updateActiveMessage(activeIndex);
				clearInterval(this.autoplayInterval);
			});
		}
	},
};

// ***ACCOUNT PAGES***
const pAccount = {
	recoverClose: function () {
		root.classList.remove("is-account-recover-active");
		history.replaceState(null, null, " ");

		const inputRecoverEmail = document.querySelector("#account-recover-email");
		if (autoFocus && inputRecoverEmail) {
			inputRecoverEmail.blur();
		}
	},
	recoverOpen: function (autoFocus = true) {
		root.classList.add("is-account-recover-active");
		history.replaceState(null, null, "#recover");

		const inputRecoverEmail = document.querySelector("#account-recover-email");
		if (autoFocus && inputRecoverEmail) {
			inputRecoverEmail.focus();
		}
	},
	init: function () {
		on("body", "click", ".js-account-recover-close", this.recoverClose);
		on("body", "click", ".js-account-recover-open", this.recoverOpen);
		on("body", "click", ".js-account-recover-toggle", (e) => {
			root.classList.contains("is-account-recover-active")
				? this.recoverClose()
				: this.recoverOpen();
		});

		// trigger recover if url contains the hash
		if (location.hash == "#recover") this.recoverOpen(false);
	},
};

// ***SEARCH***
const gSearch = {
	search: document.querySelector(".g-search"),
	searchResultsWrapper: document.querySelector(
		".g-search .js-search-results-wrapper"
	),
	liveSearchResults: document.querySelector(
		".g-search .js-live-search-results"
	),
	defaultSearchResults: document.querySelector(
		".g-search .js-default-search-results"
	),
	searchResultMessage: document.querySelector(
		".g-search .js-search-result-message"
	),
	searchResultEmpty: document.querySelector(
		".g-search .js-search-result-empty"
	),
	searchResultCount: document.querySelector(
		".g-search .js-search-result-count"
	),
	prevQuery: null,

	setMessageBoxHeight: function () {
		if (this.searchResultMessage.classList.contains("is-empty")) {
			this.searchResultMessage.style.height = `${this.searchResultEmpty.scrollHeight}px`;
		} else {
			this.searchResultMessage.style.height = `${this.searchResultCount.scrollHeight}px`;
		}
	},
	liveSearch: function (query) {
		if (query === "" || query === this.prevQuery) return;

		let searchUrl = `/search?q=${encodeURIComponent(query)}&type=product`;

		this.searchResultsWrapper.classList.add("is-loading");

		fetch(searchUrl)
			.then(function (response) {
				return response.text();
			})
			.then((data) => {
				// convert the HTML string into a document object
				let parser = new DOMParser();
				let dataDoc = parser.parseFromString(data, "text/html");

				const productCards = dataDoc.querySelectorAll(
					".js-search-results-item"
				);

				let dataSearchResults = dataDoc.querySelector(".js-search-results");

				if (productCards?.length > 0 && query !== "") {
					this.liveSearchResults.innerHTML = dataSearchResults.innerHTML;
					root.classList.add("search-has-results");

					this.searchResultMessage.classList.add("is-active");
					this.searchResultMessage.classList.remove("is-empty");

					const productCount = productCards.length;

					// this.searchResultCount.innerHTML = `${productCount} result${
					// 	productCount !== 1 ? "s" : ""
					// } for "${query}".`;

					this.searchResultsWrapper.classList.add("is-live");
					this.searchResultsWrapper.classList.remove("is-default");
				} else {
					this.liveSearchResults.innerHTML = "";
					root.classList.remove("search-has-results");
					this.searchResultsWrapper.classList.remove("is-live");
					this.searchResultsWrapper.classList.add("is-default");
					this.searchResultMessage.classList.add("is-empty");
					this.searchResultMessage.classList.add("is-active");
				}

				// this.setMessageBoxHeight();
				this.searchResultsWrapper.classList.remove("is-loading");
				this.prevQuery = query;
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	},
	searchOpen: function () {
		root.classList.add("is-search-active");
		this.search.querySelector('input[type="text"]').focus();
	},
	searchClose: function () {
		root.classList.remove("is-search-active");
	},
	searchReset: function () {
		this.searchResultsWrapper.classList.remove("is-live");
		this.searchResultsWrapper.classList.remove("is-default");
		this.searchResultMessage.classList.remove("is-active");
		this.liveSearchResults.innerHTML = "";
		this.searchResultCount.textContent = "";
		this.prevQuery = null;
	},
	init: function () {
		on("body", "click", ".js-search-trigger", (e) => {
			root.classList.contains("is-search-active")
				? this.searchClose()
				: this.searchOpen();
		});

		on("body", "click", ".js-search-reset", (e) => {
			this.searchReset();
		});

		on("body", "keydown", "body", (e) => {
			if (e.key == "Escape") {
				this.searchClose();
			} else if (
				(e.key === "f" || e.key === "k") &&
				e.shiftKey &&
				(e.metaKey || e.ctrlKey)
			) {
				this.searchOpen();
			}
		});

		on("body", "submit", ".js-search-form", (e) => {
			e.preventDefault();
		});

		// Listen for changes in the search input field
		on("body", "keyup", ".g-search .js-search-input", (e) => {
			if (e.code === "Space") return;
			// Get the search query from the input field
			let query = e.target.value;
			throttle(
				() => {
					this.liveSearch(query);
				},
				750,
				0
			);
		});

		if (window.location.hash === "#search") {
			this.searchOpen();
		}
	},
};

function pop_email_init() {
	const pop_email = document.getElementById("pop-email");
	console.log("🚀 ~ pop_email_init ~ pop_email:", pop_email);
	const pop_email_close = document.getElementById("pop-email_close");
	const pop_email_notice = document.getElementById("pop-email-notice");
	const html = document.documentElement;
	const header = document.querySelector("header"); // Assuming header exists

	let now_time = new Date().getTime();
	let setup_time = localStorage.getItem("setup_time");
	let pop_key = "ssdfk3";

	if (setup_time === null) {
		localStorage.setItem("setup_time", now_time);
	} else if (now_time - setup_time > 120 * 60 * 60 * 1000) {
		localStorage.removeItem(`display_pop_${pop_key}`);
		localStorage.setItem("setup_time", now_time);
	}

	pop_email.addEventListener("submit", function (e) {
		e.preventDefault();

		const formData = new FormData(pop_email);
		console.log("🚀 ~ formData:", formData);
		const urlEncodedData = new URLSearchParams(formData).toString();

		fetch(pop_email.getAttribute("action"), {
			method: pop_email.getAttribute("method") || "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: urlEncodedData,
		})
			.then((response) => {
				console.log("🚀 ~ .then ~ response:", response);

				return response.json();
			})
			.then((data) => {
				console.log("🚀 ~ .then ~ data:", data);
				if (data.result !== "success") {
					pop_email.classList.add("error");
					pop_email_notice.style.display = "block";
					pop_email_notice.innerHTML = `<p>${data.msg}</p>`;
				} else {
					pop_email.classList.remove("error");
					pop_email.style.display = "none";
					pop_email_notice.style.display = "block";
					pop_email_notice.innerHTML = `<p>${data.msg}</p>`;
					localStorage.setItem(`display_pop_${pop_key}`, "closed");
				}
			})
			.catch((err) => {
				const newsletterEmail = document.querySelector('[name="email"]'); // Assuming email input exists
				if (newsletterEmail) {
					newsletterEmail.classList.add("error");
				}
			});
	});

	// pop_email_close.addEventListener("click", promoClose);

	if (
		localStorage.getItem(`display_pop_${pop_key}`) !== "closed" &&
		window.location.hash.indexOf("noprm") !== 1
	) {
		setTimeout(function () {
			html.classList.add("pop_email_active");
		}, 3000);
	}

	if (window.location.hash.indexOf("noprm") === 1) {
		localStorage.setItem(`display_pop_${pop_key}`, "closed");
	}

	function promoClose() {
		html.classList.remove("pop_email_active");
		localStorage.setItem(`display_pop_${pop_key}`, "closed");

		const newsbar = document.getElementById("newsbar");
		if (newsbar) {
			html.classList.add("newsbar_active");
			if (header) {
				header.style.top = newsbar.offsetHeight + 10 + "px";
			}
		}
	}
}

// ***EXECUTE FUNCTIONS***
cWysiwygShopify.init();
cItemVariants.init();
cItemSellingPlan.init();
cItemQuantity.init();
cProductForm.init();
cCart.init();
cFiltersSort.init();
gAnnouncement.init();
gSearch.init();
pAccount.init();
document.addEventListener("DOMContentLoaded", () => {
	cInfiniteScroll.init();
	ariaFocusManager.init();

	// pop_email_init();
});
