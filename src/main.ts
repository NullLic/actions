import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

// 创建 Pinia 实例并挂载到 Vue 应用
app.use(createPinia())


app.mount('#app')
