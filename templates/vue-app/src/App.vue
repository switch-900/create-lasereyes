<script setup lang="ts">
import { DefaultLayout } from "./components/DefaultLayout.vue";
</script>

<template>
  <DefaultLayout>
    <div
      class="min-h-screen flex flex-col items-center justify-center gap-8 p-8"
    >
      <h1 class="text-4xl font-bold text-center">
        Welcome to LaserEyes Template
      </h1>
      <div class="flex flex-col items-center gap-4">
        <ConnectWallet />
        <div v-if="address" class="flex flex-col gap-2">
          <p class="text-lg text-center">Connected Address: {{ address }}</p>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>
