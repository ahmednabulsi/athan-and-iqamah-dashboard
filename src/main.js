import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')

// Tells the boot watchdog in tv.html that the bundle really ran, so it stops
// reloading. Set after mount, which is also when #app gets its first children.
window.__dashMounted = true
