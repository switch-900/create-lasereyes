<script setup lang="ts">
import { LaserEyesProvider } from "@omnisat/lasereyes";
</script>

<template>
  <LaserEyesProvider>
    <slot></slot>
  </LaserEyesProvider>
</template>
