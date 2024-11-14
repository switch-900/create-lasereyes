<script setup lang="ts">
import { useLaserEyes, UNISAT } from "@omnisat/lasereyes";

const { connect, disconnect, connected, hasUnisat } = useLaserEyes();

const handleConnect = async () => {
  if (!hasUnisat) {
    console.error("Please install Unisat wallet");
    return;
  }
  await connect(UNISAT);
};
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <button
      @click="connected ? disconnect() : handleConnect()"
      class="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
    >
      {{ connected ? "Disconnect" : "Connect Wallet" }}
    </button>
  </div>
</template>
