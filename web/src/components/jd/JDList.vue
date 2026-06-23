<!-- JDList.vue — 岗位列表 -->
<template>
  <div class="jd-list">
    <JDItem
      v-for="jd in list"
      :key="jd.id"
      :jd="jd"
      @delete="$emit('delete', jd.id)"
      @analyze="$emit('analyze', $event)"
    />
  </div>
</template>

<script setup>
import JDItem from './JDItem.vue'

defineProps({
  list: {
    type: Array,
    default: () => []
  }
})

defineEmits(['delete', 'analyze'])
</script>

<style scoped>
.jd-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: var(--space-md);
}
</style>
