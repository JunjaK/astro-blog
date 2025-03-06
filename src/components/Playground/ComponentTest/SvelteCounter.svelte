<script lang="ts">
  import { Icon } from "@iconify/react";

  let counter = $state(0);
  function counterChange(arg: "increment" | "decrement") {
    if (arg === "increment") {
      counter++;
    } else {
      counter--;
    }
  }

  const doubleCount = $derived(counter * 2);
</script>

<div class="flex items-center justify-between mx-auto w-1/2">
  <button class="text-2xl" onclick={() => counterChange("decrement")}>
    -
  </button>
  <p class="text-2xl font-bold">
    {counter}
  </p>
  <button class="text-2xl" onclick={() => counterChange("increment")}>
    +
  </button>
</div>

<div>
  DoubleCount: {doubleCount}
</div>
