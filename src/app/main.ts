import { createApp } from 'vue'
import '@/shared/styles/main.css'
import '@/shared/styles/fonts.css'
import App from './App.vue'
import { router } from './router'

createApp(App).use(router).mount('#app')
