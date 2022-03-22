import VueAmountFormatInput from './components/VueAmountFormatInput.vue'

const AmountFormatInputInstall = {
	install(Vue, options) {
		// Let's register our component globally
		/* Plugin code goes here */
		Vue.component('vue-amount-format-input', VueAmountFormatInput)
	}
};

// Automatic installation if Vue has been added to the global scope.
if (typeof window !== 'undefined' && window.Vue) {
    window.Vue.use(AmountFormatInputInstall)
}

export default AmountFormatInputInstall
