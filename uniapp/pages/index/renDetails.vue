<template>
	<view>
		<topBox pageName='' :myInfo='myInfo'></topBox>
		<view class='pageBox zzz3'>
			<view class='app_imgBox zzz3'>
				<view class='title'>学术评审详情</view>
			</view>
			<view class='boxs3'>
				<view class='e1 breadcrumb-row'>
					<view class='e1 breadcrumb-left'>
						<image class='backImg pointer'
							src='/static/local_assets/fef85503edbf82dabb254127.png' @click="goBack" />
						<view class='titleT'>当前位置：学术评审详情</view>
					</view>
					<view class='back-btn pointer' @click="goBack">
						<text>返回上级</text>
						<image src='/static/local_assets/1bee64b18103d2c0fc51a024.png' />
					</view>
				</view>
				<view class='titleLine'></view>
				<view class='zzz3'>
					<view class='BigTitle'>{{datas.title}}</view>
					<view class='timeTitle'>{{datas.created_at}}</view>
					<view class='fwb' v-html="datas.content"></view>
				</view>
			</view>
		</view>
		<bottomBox pageName='' :configData="configData"></bottomBox>
	</view>
</template>

<script>
	import topBox from '@/components/topBox.vue';
	import bottomBox from '@/components/bottomBox.vue';
	import competitionNewsItem from '@/components/competitionNewsItem.vue';
	export default {
		components: {
			topBox,
			bottomBox,
			competitionNewsItem
		},
		data() {
			return {
				configData: {},
				list1: [],
				page_no: 1,
				page_type: 'list',
				in_type: 'list',
				scrollPosition: 0,
				currentPageData: [], // 当前页的数据
				datas: {},
				isShow: false,
				myInfo: {},
				isLogin: true,
			}
		},
		onLoad(e) {
			this.id = e.id
			this.golook1()

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
			golook1() {
				this.GET({
					name: '人详情',
					url: '/api/product/newsdetail?id=' + this.id,
					data: {}
				}).then((res) => {
					this.datas = res.data.data;
				});
			},
		}
	}
</script>

<style lang="scss" scoped>
	/*  电脑端样式 */
	@media (min-width: 769px) {
		.pageBox {
			width: 100vw;

			.boxs3 {
				width: 60.11vw;
				max-width: 3200rpx;
				margin-top: 1.56vw;

				.breadcrumb-row {
					display: flex;
					justify-content: space-between;
					align-items: center;
					width: 100%;

					.breadcrumb-left {
						display: flex;
						align-items: center;
					}

					.backImg {
						width: 1.2vw;
						height: 1.2vw;
						margin-right: 0.5vw;
					}

					.titleT {
						font-weight: 500;
						font-size: 0.94vw;
						color: #999999;
					}

					.back-btn {
						display: flex;
						align-items: center;
						font-size: 0.83vw;
						color: #666666;
						transition: color 0.3s ease;

						text {
							margin-right: 0.3vw;
						}

						image {
							width: 0.52vw;
							height: 0.52vw;
						}

						&:hover {
							color: #E62402;

							image {
								filter: brightness(0) saturate(100%) invert(31%) sepia(94%) saturate(6016%) hue-rotate(358deg) brightness(97%) contrast(88%);
							}
						}
					}
				}

				.titleLine {
					width: 100%;
					height: 2rpx;
					background-color: #E62402;
					margin: 2.14vw 0 1.67vw 0;
				}

				.BigTitle {
					font-weight: bold;
					font-size: 2.08vw;
					color: #1F1F1F;
				}

				.timeTitle {
					font-weight: 500;
					font-size: 1.04vw;
					color: #999999;
					margin: 2.08vw 0 2.14vw 0;
				}

				.fwb {
					font-size: 1vw;
					color: #1F1F1F;
					margin-bottom: 4vw;
					text-align: justify;
					text-align-last: left;
					letter-spacing: 0;
					line-height: 1.8;
					text-indent: 2em;
					font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif !important;

					/* 覆盖富文本内部的字体样式 */
					::v-deep * {
						font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif !important;
					}
				}
			}
		}

		.placeholder-box {
			width: 19.27vw;
			margin-bottom: 2.45vw;
		}
	}

	/*  手机端样式 */
	@media (max-width: 768px) {
		.pageBox {
			width: 100vw;

			.boxs3 {
				width: 700rpx;
				margin-top: 30rpx;

				.breadcrumb-row {
					display: flex;
					justify-content: space-between;
					align-items: center;
					width: 100%;

					.breadcrumb-left {
						display: flex;
						align-items: center;
					}

					.backImg {
						width: 32rpx;
						height: 32rpx;
						margin-right: 12rpx;
					}

					.titleT {
						font-weight: 500;
						font-size: 28rpx;
						color: #999999;
					}

					.back-btn {
						display: flex;
						align-items: center;
						font-size: 24rpx;
						color: #666666;

						text {
							margin-right: 8rpx;
						}

						image {
							width: 24rpx;
							height: 24rpx;
						}
					}
				}

				.titleLine {
					width: 100%;
					height: 2rpx;
					background-color: #E62402;
					margin: 12rpx 0 12rpx 0;
				}

				.BigTitle {
					font-weight: bold;
					font-size: 34rpx;
					color: #1F1F1F;
				}

				.timeTitle {
					font-weight: 500;
					font-size: 24rpx;
					color: #999999;
					margin: 20rpx 0 20rpx 0;
				}

				.fwb {
					font-size: 28rpx;
					color: #1F1F1F;
					margin-bottom: 40rpx;
					text-align: justify;
					text-align-last: left;
					letter-spacing: 0;
					line-height: 1.8;
					text-indent: 2em;
					font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif !important;

					/* 覆盖富文本内部的字体样式 */
					::v-deep * {
						font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif !important;
					}
				}
			}
		}

		.placeholder-box {
			width: 100%;
			margin-bottom: 30rpx;
		}
	}

	.placeholder-item {
		visibility: hidden;
		// 或者用 opacity: 0; 但 visibility 更干净
	}
</style>