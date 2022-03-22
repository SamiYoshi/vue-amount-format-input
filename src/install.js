import VueAmountFormatInput from './components/VueAmountFormatInput.vue'

export default {
	install(Vue, options) {
		// Let's register our component globally
		/* Plugin code goes here */
		Vue.component('vue-amount-format-input', VueAmountFormatInput)
	}
}
