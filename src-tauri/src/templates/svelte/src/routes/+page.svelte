<script lang="ts">
  let count = $state(0)
</script>

<main>
  <h1>{{project_name}}</h1>
  <button onclick={() => count++}>
    count is {count}
  </button>
</main>

<style>
  main {
    text-align: center;
    padding: 2rem;
    font-family: system-ui, sans-serif;
  }
</style>
