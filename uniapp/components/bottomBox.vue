<template>
	<view>
		<view class='bottomBox zzz3'>
			<view class='view_3l8i' :class="$isPC?'e2':'zzz3'">
				<image class="logos pointer"
					src='/static/local_assets/group-logo.png' mode="widthFix"
					@click="reLaunch('/pages/index/index')" />
				<view class="jsBox">
					<view class='e11'>
						<image class='tupian' src='/static/local_assets/32df6932306a5bd8fbb4f4bf.png' />
						<view class='wenzi'>“常青藤”全国青少年校园戏剧创意大赛组委会版权所有</view>
					</view>
					<view class='e11'>
						<image class='tupian' src='/static/local_assets/d3fb07ad0343115a4007b54e.png' />
						<view class='wenzi'>咨询电话：{{ configData.shouji }}</view>
					</view>
					<view class='e11'>
						<image class='tupian' src='/static/local_assets/22ef685606c8fda5bc279a2c.png' />
						<view class='wenzi'>电子邮箱：{{ configData.youxiang }}</view>
					</view>
					<view class='e11'>
						<image class='tupian' src='/static/local_assets/c8a62738db73cbc73c66a09f.png' />
						<view class='wenzi'>联系地址：{{ configData.dizhi }}</view>
					</view>
					<view class='e11'>
						<image class='tupian' src='/static/local_assets/819856aa88511b993f461bf3.png' />
						<view class='wenzi'>{{ configData.shangwuhezuo }}</view>
					</view>
				</view>
				<view class='zzz3'>
					<view class='ewmImg zzz3' v-if="gongzhonghaoUrl">
						<image class="pointer" :src="gongzhonghaoUrl" mode="aspectFill"
							style="object-fit: cover" @click="lookImg(gongzhonghaoUrl)" />
						<text>扫码关注公众号</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: "bottomBox",
		props: {
			// 接收页面名称
			pageName: {
				type: String,
				default: ''
			},
			// 接收配置对象
			configData: {
				type: Object,
				default: () => ({
					shouji: '',
					youxiang: '',
					dizhi: '',
					shangwuhezuo: '',
					gongzhonghao: []
				})
			}
		},
		computed: {
			gongzhonghaoUrl() {
				const images = this.configData && Array.isArray(this.configData.gongzhonghao)
					? this.configData.gongzhonghao
					: [];
				return images[0] || '';
			}
		},
		data() {
			return {};
		},
		methods: {
			// 补充页面跳转方法
			reLaunch(url) {
				uni.reLaunch({
					url
				})
			},
			// 预览图片方法
			lookImg(url) {
				uni.previewImage({
					urls: [url]
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	/*  电脑端样式 */
	@media (min-width: 769px) {
		.bottomBox {
			position: relative;
			background-image: url('/static/local_assets/cb75107df14d36286f281898.png');
			background-position: center center;
			background-repeat: no-repeat;
			background-size: cover;
			width: 100vw;
			padding-top: 2.4vw;
			padding-bottom: 2.4vw;
			box-sizing: border-box;

			.view_3l8i {
				width: 86.56vw;
				max-width: 4200rpx;
				padding: 0 2vw;
				box-sizing: border-box;
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin: 0 auto;
			}

			.logos {
				width: 14.13vw;
			}

			.jsBox {
				display: flex;
				flex-direction: column;
				gap: 0.78vw;
				margin: 0 2vw;

				.e11 {
					display: flex;
					align-items: center;
				}

				.tupian {
					width: 1.25vw;
					height: 1.25vw;
					margin-right: 0.83vw;
				}

				.wenzi {
					font-weight: bold;
					font-size: 0.94vw;
					color: #FFFFFF;
					line-height: 1.25vw;
				}
			}

			.ewmImg {
				width: 8.33vw;
				display: flex;
				flex-direction: column;
				align-items: center;

				image {
					width: 8.33vw;
					height: 8.33vw;
					margin-bottom: 0.47vw;
					border-radius: 10rpx;
				}

				text {
					width: 8.33vw;
					font-size: 0.83vw;
					color: #FFFFFF;
					text-align: center;
				}
			}
		}
	}

	/*  手机端样式 */
	@media (max-width: 768px) {
		.bottomBox {
			background-image: url('/static/local_assets/48d00c58cf158fcef4040681.png');
			background-position: center center;
			background-repeat: no-repeat;
			background-size: cover;
			width: 100%;
			padding: 30rpx;
			box-sizing: border-box;
			background: #E62402;

			.view_3l8i {
				width: 100%;
				display: flex;
				flex-direction: column;
				align-items: center;
			}

			.logos {
				width: 300rpx;
			}

			.jsBox {
				display: flex;
				flex-direction: column;
				gap: 30rpx;
				margin: 60rpx 0;
				width: 100%;

				.e11 {
					display: flex;
					align-items: center;
				}

				.tupian {
					width: 32rpx;
					height: 32rpx;
					margin-right: 14rpx;
					flex-shrink: 0;
				}

				.wenzi {
					font-weight: 400;
					font-size: 28rpx;
					color: #FFFFFF;
					line-height: 32rpx;
				}
			}

			.ewmImg {
				width: 240rpx;
				display: flex;
				flex-direction: column;
				align-items: center;

				image {
					width: 240rpx;
					height: 240rpx;
					margin-bottom: 10rpx;
					border-radius: 10rpx;
				}

				text {
					width: 240rpx;
					font-size: 28rpx;
					color: #FFFFFF;
					text-align: center;
				}
			}
		}
	}
</style>
