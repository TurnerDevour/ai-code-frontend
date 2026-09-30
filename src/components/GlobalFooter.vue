<template>
  <a-layout-footer class="footer">
    <div class="footer-content">
      <p class="copyright">
        <span class="copyright-mark">©</span>
        <a
          href="https://www.wlbc.top"
          target="_blank"
          rel="noopener noreferrer"
          class="author-link"
        >
          AI 零代码应用生成平台
        </a>
        <span class="footer-divider"></span>
        <span class="footer-slogan">让灵感即刻落地</span>
      </p>
    </div>
  </a-layout-footer>
</template>

<script setup lang="ts"></script>

<style scoped>
.footer {
  padding: 16px 24px;
  background: rgb(248 251 255 / 92%);
  border-top: 1px solid rgb(219 234 254 / 85%);
  box-shadow: 0 -8px 28px rgb(43 85 145 / 5%);
  text-align: center;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  backdrop-filter: blur(12px);
}

.copyright {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin: 0;
  color: #8a9ab1;
  font-size: 13px;
  line-height: 1.5;
}

.copyright-mark {
  display: inline-grid;
  width: 18px;
  height: 18px;
  color: #5a70a2;
  font-size: 12px;
  place-items: center;
  border: 1px solid #d7e4f8;
  border-radius: 50%;
  background: #fff;
}

.author-link {
  font-weight: 600;
  color: #1677ff;
  text-decoration: none;
  background: linear-gradient(105deg, #1677ff, #6d5dfc);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.author-link:hover {
  opacity: 0.78;
}

.footer-divider {
  width: 1px;
  height: 13px;
  background: #d6e1f1;
}

.footer-slogan {
  color: #8a9ab1;
}

@media (max-width: 480px) {
  .footer {
    padding: 12px 16px;
  }

  .footer-slogan,
  .footer-divider {
    display: none;
  }
}
</style>
