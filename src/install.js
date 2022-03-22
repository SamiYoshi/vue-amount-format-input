import VueAmountFormatInput from './components/VueAmountFormatInput.vue'

export default {
    install: (app, options) => {
        /* Plugin code goes here */
        app.component('vue-amount-format-input', VueAmountFormatInput)
    }
}
