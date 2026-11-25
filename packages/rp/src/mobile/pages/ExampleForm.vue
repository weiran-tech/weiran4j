<script setup>
import { ref } from 'vue';
import { Form as VanForm, Field as VanField, Button as VanButton, CellGroup as VanCellGroup, showToast } from 'vant';
const props = defineProps({ scenario: { type: String, default: 'normal' } });
const name = ref('');
const phone = ref('');
const error = ref('');
function submit() {
    if (props.scenario === 'failure') { error.value = '模拟提交失败，输入已保留，请切换正常场景后重试'; return; }
    error.value = ''; showToast('模拟提交成功，不会发送个人资料');
}
</script>
<template><section class="welcome"><span>FORM TEMPLATE</span><h1>联系信息示例</h1><p>请使用虚构信息体验必填校验与失败重试。</p></section><van-form @submit="submit"><van-cell-group inset><van-field v-model="name" name="name" label="称呼" placeholder="填写虚构称呼" :rules="[{ required: true, message: '请填写称呼' }]" /><van-field v-model="phone" name="phone" label="手机号" type="tel" placeholder="演示号码" :rules="[{ required: true, message: '请填写手机号' }, { pattern: /^1\d{10}$/, message: '请输入 11 位演示手机号' }]" /></van-cell-group><div class="action-area"><p role="alert">{{ error }}</p><van-button native-type="submit" block round type="primary">模拟提交</van-button></div></van-form></template>
