<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed, ref } from 'vue';

const count = ref(0);
const doubleCount = computed(() => count.value * 2);

function counterChange(arg: 'increment' | 'decrement') {
  if (arg === 'increment') {
    count.value++;
  }
  else {
    count.value--;
  }
}
</script>

<template>
  <div class="flex items-center justify-between mx-auto w-1/2">
    <button class="text-2xl" @click="counterChange('decrement')">
      <Icon icon="tabler:minus" />
    </button>
    <p class="text-2xl font-bold">
      {{ count }}
    </p>
    <button class="text-2xl" @click="counterChange('increment')">
      <Icon icon="tabler:plus" />
    </button>
  </div>

  <div>
    DoubleCount: {{ doubleCount }}
  </div>
</template>
