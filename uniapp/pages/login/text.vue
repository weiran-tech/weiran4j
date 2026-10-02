<template>
	<view class="agreement-page">
		<topBox pageName='' :myInfo='myInfo'></topBox>
		<view class='zzz3'>
			<view class='textsBox zzz3'>
				<view class='e2 w100b'>
					<view class='wzBox pointer' @click="goBack">返回上一级</view>
					<view class='text'>{{text}}</view>
					<view class='wzBox'></view>
				</view>
				<view class='line'></view>
				<view class='vhtml' v-html='vhtml'></view>
			</view>
		</view>
		<bottomBox pageName='' :configData="configData"></bottomBox>
	</view>
</template>

<script>
	import topBox from '@/components/topBox.vue';
	import bottomBox from '@/components/bottomBox.vue';

	export default {
		components: {
			topBox,
			bottomBox
		},
		data() {
			return {
				configData: {},
				text: '',
				myInfo: {},
				isLogin: true,
			}
		},
		onLoad(e) {
			this.text = e.text
			this.GET({
				name: '获取网站配置',
				url: '/api/product/getconfig',
				data: {}
			}).then((res) => {
				if (this.text == '用户协议') {
					this.vhtml = res.data.data.user_agreement
				}
			});

			this.POST({
				name: '个人信息2',
				url: '/api/auth/userinfo',
				data: {}
			}).then((res) => {
				if (res.data.code == 401) {
					this.isLogin = false
				} else {
					console.log('--已登录')
					this.isLogin = true
					this.myInfo = res.data.data
				}
			});
		},
		onShow() {
			this.GET({
				name: '获取网站配置',
				url: '/api/product/getconfig',
				data: {}
			}).then((res) => {
				this.configData = res.data.data
			});
		},
		methods: {

		}
	}
</script>

<style lang="scss">
	/* 💻 电脑端样式 */
	@media (min-width: 769px) {
		.textsBox {
			width: 66vw;
			max-width: 4000rpx;
			margin-top: 10vw;

			.wzBox {
				width: 6vw;
				text-align: center;
				font-size: 1vw;
				color: #E62402;
				text-decoration: underline;
			}

			.text {
				font-size: 2vw;
				font-weight: 900;
				color: #333;
			}

			.line {
				width: 100%;
				height: 1rpx;
				background-color: #e2e2e2;
				margin: 1vw;
			}

			.vhtml {
				margin-bottom: 4vw;
				min-height: 20vw;

				line-height: 1.8;

				/* 关键：保留换行 */
				white-space: pre-wrap;
				word-wrap: break-word;

				::v-deep p {
					margin-bottom: 20rpx;
					line-height: 1.8;
					text-indent: 2em;
					/* 移动端首行缩进 */
				}

				::v-deep div {
					margin-bottom: 10rpx;
				}

				::v-deep br {
					line-height: 2;
				}

				::v-deep img {
					max-width: 100%;
					height: auto;
				}
			}
		}
	}

	/* 📱 手机端样式 */
	@media (max-width: 768px) {
		.textsBox {
			width: 700rpx;
			margin-top: 180rpx;

			.wzBox {
				width: 150rpx;
				text-align: center;
				font-size: 28rpx;
				color: #E62402;
				text-decoration: underline;
			}

			.text {
				font-size: 40rpx;
				font-weight: 900;
				color: #333;
			}

			.line {
				width: 100%;
				height: 1rpx;
				background-color: #e2e2e2;
				margin: 1vw;
			}

			.vhtml {
				margin-bottom: 4vw;

				line-height: 1.8;

				/* 关键：保留换行 */
				white-space: pre-wrap;
				word-wrap: break-word;

				::v-deep p {
					margin-bottom: 20rpx;
					line-height: 1.8;
					text-indent: 2em;
					/* 移动端首行缩进 */
				}

				::v-deep div {
					margin-bottom: 10rpx;
				}

				::v-deep br {
					line-height: 2;
				}

				::v-deep img {
					max-width: 100%;
					height: auto;
				}
			}
		}
	}
</style>