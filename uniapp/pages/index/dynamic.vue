<template>
	<view>
		<topBox pageName='大赛动态' :myInfo='myInfo'></topBox>
		<view class='pageBox zzz3'>
			<view class='app_imgBox zzz3'>
				<view class='title'>大赛动态</view>
			</view>

			<!-- 列表模式 -->
			<view class='boxs3' v-if="page_type=='list'">
				<view :class="$isPC ? 'e2 e3' : ''">
					<view v-for="(item, index) in displayList1" :key="index"
						:class="{ 'placeholder-item': item.isPlaceholder }">
						<competitionNewsItem v-if="!item.isPlaceholder" :item="item" @click="golook1(item)" />
						<view v-else class="placeholder-box"></view>
					</view>
				</view>
				<scroll-view class="app_scrollView" scroll-x v-if="totalPages > 1">
					<view class='e1 numE1'>
						<view :class="page_no==index+1?'true':'false'" v-for='(page, index) in totalPages' :key='index'
							@click="goPageNo(index+1)">
							{{index+1}}
						</view>
					</view>
				</scroll-view>
			</view>

			<!-- 详情模式 -->
			<view class='boxs3' v-if="page_type=='details' && isShow==true">
				<view class='breadcrumb-row'>
					<view class='e1 breadcrumb-left'>
						<image v-if="in_type == 'index'" class='backImg pointer'
							src='/static/local_assets/fef85503edbf82dabb254127.png' @click="goBack" />
						<image v-if="in_type == 'list'" class='backImg pointer'
							src='/static/local_assets/de6ec6b4ce0d2d1d9db89f22.png' @click="goList" />

						<view class='titleT'>
							当前位置：
							<span @click="handleBreadcrumbClick" class="pointer">大赛动态</span>
							<span style='color: #1F1F1F'>详情</span>
						</view>
					</view>
					<view class='back-btn pointer' @click="handleBack">
						<text>返回上级</text>
						<image src='/static/local_assets/1bee64b18103d2c0fc51a024.png' />
					</view>
				</view>
				<view class='titleLine'></view>
				<view class='zzz3'>
					<view class='BigTitle'>{{datas.title}}</view>
					<view class='timeTitle'>{{datas.created_at}}</view>

					<!-- 单独展示视频 -->
					<video v-if="datas.video" class="news-video" :src="localMediaUrl(datas.video)" controls
						autoplay></video>

					<!-- 同一份正文通过响应式样式适配电脑端和手机端 -->
					<view class='fwb' v-html="cleanContent"></view>
				</view>
			</view>

			<!-- 加载中提示 -->
			<view v-if="page_type=='details' && !isShow" style="padding: 100rpx; text-align: center;">
				加载中...
			</view>
		</view>
		<bottomBox pageName='大赛动态' :configData="configData"></bottomBox>
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
				currentPageData: [],
				datas: {},
				isShow: false,
				myInfo: {},
				isLogin: true,
				currentId: null
			}
		},
		onLoad(e) {
			this.page_type = 'list';
			this.in_type = 'list';
			this.isShow = false;

			if (e.page_type) this.page_type = e.page_type;
			if (e.in_type) this.in_type = e.in_type;

			if (!uni.getStorageSync('dynamic_jump_params')) {
				if (this.page_type === 'list' || !this.page_type) {
					this.get_index();
				}
			}

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
			this.getTabber(this.$isPC);

			const cachedParams = uni.getStorageSync('dynamic_jump_params');

			if (cachedParams && cachedParams.page_type === 'details' && cachedParams.id) {
				this.page_type = 'details';
				this.in_type = cachedParams.in_type || 'index';
				this.loadDetail(cachedParams.id);
				uni.removeStorageSync('dynamic_jump_params');
				console.log('检测到缓存跳转，已加载详情 ID:', cachedParams.id);
			} else {
				if (this.page_type === 'list' && this.list1.length === 0) {
					this.get_index();
				}
			}


			this.GET({
				name: '获取网站配置',
				url: '/api/product/getconfig',
				data: {}
			}).then((res) => {
				this.configData = res.data.data
			});
		},
		computed: {
			displayList1() {
				let list = [...this.list1];
				const len = list.length;
				if (len > 0 && len % 3 === 2) {
					list.push({
						isPlaceholder: true
					});
				}
				return list;
			},
			totalPages() {
				return Math.ceil(this.displayList1.length / 9);
			},
			// 正文统一维护，电脑端和手机端使用同一内容
			cleanContent() {
				if (!this.datas.content) return '';
				// 正则匹配并移除video标签
				return this.datas.content.replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, '');
			}
		},
		watch: {
			displayList1() {
				this.goPageNo(this.page_no);
			}
		},
		methods: {
			localMediaUrl(url) {
				if (!url) return '';
				if (url.startsWith('/uploads/')) return url;
				return '/uploads/' + url.replace(/^https?:\/\/[^/]+\//, '').replace(/^(storage|uploads)\//, '');
			},
			get_index() {
				this.GET({
					name: '大赛动态',
					url: '/api/product/index?category=2',
					data: {}
				}).then((res) => {
					this.list1 = res.data.data.data || [];
				});
			},
			loadDetail(id) {
				uni.showLoading({
					title: '加载中...'
				});
				this.GET({
					name: '大赛动态详情',
					url: '/api/product/newsdetail?id=' + id,
					data: {}
				}).then((res) => {
					uni.hideLoading();
					if (res.data.code === 200 || res.data.code === 0) {
						this.datas = res.data.data;
						this.isShow = true;
						this.$nextTick(() => {
							// #ifdef H5
							window.scrollTo(0, 0);
							// #endif
						});
					} else {
						uni.showToast({
							title: '加载失败',
							icon: 'none'
						});
						this.goList();
					}
				}).catch(() => {
					uni.hideLoading();
					uni.showToast({
						title: '网络错误',
						icon: 'none'
					});
				});
			},
			updateCurrentPageData(pageNo) {
				const start = (pageNo - 1) * 9;
				const end = start + 9;
				this.currentPageData = this.displayList1.slice(start, end);
			},
			goPageNo(pageNo) {
				this.page_no = pageNo;
				this.updateCurrentPageData(pageNo);
			},
			golook1(item) {
				// #ifdef H5
				this.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
				// #endif
				this.page_type = 'details';
				this.in_type = 'list';
				this.loadDetail(item.id);
			},
			handleBreadcrumbClick() {
				if (this.in_type === 'index') {
					this.goBack();
				} else {
					this.goList();
				}
			},
			goList() {
				if (this.in_type === 'index') {
					this.goBack();
					return;
				}
				this.page_type = 'list';
				this.isShow = false;
				this.$nextTick(() => {
					// #ifdef H5
					if (this.scrollPosition) {
						window.scrollTo(0, this.scrollPosition);
					}
					// #endif
				});
			},
			goBack() {
				uni.switchTab({
					url: '/pages/index/index'
				});
			},
			handleBack() {
				if (this.in_type === 'index') {
					this.goBack();
				} else {
					this.goList();
				}
			},
		}
	}
</script>

<style lang="scss" scoped>
	/* 电脑端样式 */
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

				/* 视频样式 */
				.news-video {
					width: 100%;
					height: 1200rpx;
					margin: 1vw 0 2vw 0;
					border-radius: 8rpx;
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

	/* 手机端样式 */
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

				.titleT {
					font-weight: 500;
					font-size: 28rpx;
					color: #999999;
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

				/* 手机端视频样式 */
				.news-video {
					width: 100%;
					margin: 20rpx 0 30rpx 0;
					border-radius: 8rpx;
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
	}
</style>
