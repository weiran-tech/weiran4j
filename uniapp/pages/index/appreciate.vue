<template>
	<view>
		<topBox pageName="佳作展示" :isShowAboutTab='isShowAboutTab' @updateAboutPage="handleAboutPageChange"
			@toggleAboutTab="isShowAboutTab = !isShowAboutTab" :myInfo='myInfo'></topBox>
		<view class='pageBox zzz3'>
			<view class='app_imgBox zzz3'>
				<view class='title'>佳作欣赏</view>
			</view>
			<view class="zzz3" v-if="page_type=='list'">
				<view class='tabBox e1'>
					<view class='zzz3' @click="goAbout_Page(item)" v-for="(item, index) in list" :key="index">
						<view :class="type_id==item.id?'text_true':'text_false'">{{item.name}}</view>
						<view :class="type_id==item.id?'line_true':'line_false'"></view>
					</view>
				</view>
				<view class='tabLine'></view>
				<view class='listBox'>
					<view class='listBox'>
						<view class='e2 e3'>
							<view class="itemBox pointer" v-for='(item, index) in currentPageData' :key='index'
								@click="golook1(item)">
								<!-- 列表图片自动补全域名 -->
								<image class='image' :src="fixImageUrl(item.image)" mode="aspectFill"
									style="object-fit: cover" />
								<view class='nameBox'>
									<view class='name textsl1'>{{item.title}}</view>
									<view class='e1'>
										<view class='text1 e2'>
											<view>作</view>
											<view>者：</view>
										</view>
										<view class='text2 textsl1'>{{item.auth}}</view>
									</view>
									<view class='e1'>
										<view class='text1 e2'>
											<view>指</view>
											<view>导</view>
											<view>老</view>
											<view>师：</view>
										</view>
										<view class='text2 textsl1'>{{item.teacher}}</view>
									</view>
									<view class='e1'>
										<view class='text1 e2'>
											<view>所</view>
											<view>在</view>
											<view>学</view>
											<view>校：</view>
										</view>
										<view class='text2 textsl1'>{{item.school}}</view>
									</view>
								</view>
							</view>

							<!-- 动态空占位符 -->
							<view class="itemBox empty" v-for="n in placeholderCount" :key="'ph-'+n"></view>
						</view>

						<!-- 分页器 -->
						<scroll-view class="app_scrollView" scroll-x>
							<view class='e1 numE1'>
								<view :class="page_no==index+1?'true':'false2'" v-for='(item, index) in totalPages'
									:key='index' @click="goPageNo(index+1)">
									{{index+1}}
								</view>
							</view>
						</scroll-view>
					</view>
				</view>
			</view>

			<!-- 详情页部分 -->
			<view class='boxs3' v-if="page_type=='details'&&isShow==true">
				<view class='e1 breadcrumb-row'>
					<view class='e1 breadcrumb-left'>
						<image class='backImg pointer'
							src='/static/local_assets/fef85503edbf82dabb254127.png' @click="goList" />
						<view class='titleT'>当前位置：<span class='pointer' @click="goList">佳作欣赏</span>--<span
								style='color: #1F1F1F'>详情</span>
						</view>
					</view>
					<view class='back-btn pointer' @click="goList">
						<text>返回上级</text>
						<image src='/static/local_assets/1bee64b18103d2c0fc51a024.png' />
					</view>
				</view>
				<view class='titleLine'></view>
				<view class='zzz3'>
					<view class='titleBox zzz3'>
						<view class='BigTitle'>{{datas.title}}</view>

						<!-- 单独展示视频 -->
						<video v-if="datas.video" class="news-video"
							:src="fixImageUrl(datas.video)" controls autoplay
							:style="$isPC ? 'height:1200rpx' : 'height:400rpx'"></video>

						<!-- 【媒体展示区域】统一展示提取出的图片 -->
						<view class="media-container" v-if="mediaList && mediaList.length > 0">
							<view v-for="(item, index) in mediaList" :key="index" class="media-item">
								<!-- 渲染图片 -->
								<image v-if="item.type === 'image'" class="w100b pointer" :src="fixImageUrl(item.url)"
									mode="widthFix" style="width: 100%; border-radius: 8rpx; display: block;"
									@error="mediaError('image', item.url)" @click="lookImg(fixImageUrl(item.url))">
								</image>
							</view>
						</view>

						<view class='text1'>作者姓名：<span class='text2'>{{datas.auth}}</span></view>
						<view class='text1'>指导老师：<span class='text2'>{{datas.teacher}}</span></view>
						<view class='text1'>所在学校：<span class='text2'>{{datas.school}}</span></view>
						<view class='text1'>作品简介：<span class='text2'>{{datas.description}}</span></view>

						<!-- 【内容区域】已移除视频标签 -->
						<view class='fwb' v-html="cleanContent"></view>
					</view>
					<view class='heightBox'></view>
				</view>
			</view>
		</view>
		<bottomBox pageName='成绩查询' :configData="configData"></bottomBox>
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
				isShow: false,
				isShowAboutTab: true,
				aboutPage: '全部',
				list: [{
					id: 0,
					name: '全部'
				}, {
					id: 1,
					name: '剧本写作'
				}, {
					id: 2,
					name: '剧目演出'
				}],
				page_no: 1,
				page_type: 'list',
				scrollPosition: 0,
				jzlist: [],
				currentPageData: [],
				datas: {},
				type_id: 0,
				mediaList: [],
				debugMode: false,
				myInfo: {},
				isLogin: true,
				baseURL3: 'https://admin.cqtxj.org.cn/storage/'
			}
		},
		onLoad() {
			this.get_index();
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

			this.GET({
				name: '获取网站配置',
				url: '/api/product/getconfig',
				data: {}
			}).then((res) => {
				this.configData = res.data.data
			});
		},
		computed: {
			totalPages() {
				return Math.ceil(this.jzlist.length / 8);
			},
			placeholderCount() {
				const count = this.currentPageData.length;
				const remainder = count % 4;
				return remainder === 2 ? 2 : remainder === 3 ? 1 : 0;
			},
			// 清理富文本中的视频标签
			cleanContent() {
				if (!this.datas.content) return '';
				return this.datas.content.replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, '');
			}
		},
		methods: {
			// ====================== 核心方法：自动补全图片链接 ======================
			fixImageUrl(url) {
				if (!url) return '';
				if (url.startsWith('http://') || url.startsWith('https://')) {
					return url;
				}
				return '/uploads/' + url.replace(/^(storage|uploads)\//, '');
			},

			get_index() {
				this.GET({
					name: '佳作欣赏 - 作品',
					url: '/api/product/index?category=3&secondcategory=' + this.type_id,
					data: {}
				}).then((res) => {
					this.jzlist = res.data.data.data;
					this.updateCurrentPageData(1);
				});
			},
			handleAboutPageChange(pageName) {
				this.aboutPage = pageName;
			},
			updateCurrentPageData(pageNo) {
				const start = (pageNo - 1) * 12;
				const end = start + 12;
				this.currentPageData = this.jzlist.slice(start, end);
			},
			goPageNo(pageNo) {
				this.page_no = pageNo;
				this.updateCurrentPageData(pageNo);
			},
			goAbout_Page(item) {
				this.isShowAboutTab = false;
				this.aboutPage = item;
				this.type_id = item.id;
				this.get_index();
			},
			goPageNo(e) {
				this.page_no = e;
			},

			// 提取图片
			extractMedia(content) {
				if (!content) return {
					cleanContent: '',
					media: []
				};

				let cleanContent = content;
				const media = [];

				const cleanUrl = (url) => {
					if (!url) return '';
					let u = url.trim();
					u = u.replace(/(#\/|#)$/, '');
					return u;
				};

				// 匹配 <img>
				const imgRegex = /<img[^>]*src=["']([^"']*?)["'][^>]*>/gi;
				cleanContent = cleanContent.replace(imgRegex, (match, src) => {
					const cleaned = cleanUrl(src);
					if (cleaned) {
						media.push({
							type: 'image',
							url: cleaned
						});
					}
					return '';
				});

				return {
					cleanContent,
					media
				};
			},

			golook1(item) {
				this.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
				this.isShow = false;
				this.page_type = 'details';
				this.mediaList = [];

				uni.showLoading({
					title: '加载中...'
				});

				this.GET({
					name: '详情',
					url: '/api/product/newsdetail?id=' + item.id,
					data: {}
				}).then((res) => {
					uni.hideLoading();
					const rawData = res.data.data;

					if (rawData && rawData.content) {
						const result = this.extractMedia(rawData.content);
						rawData.content = result.cleanContent;
						this.mediaList = result.media;
					} else {
						this.mediaList = [];
					}

					this.datas = rawData;
					this.isShow = true;

					this.$nextTick(() => {
						window.scrollTo(0, 0);
					});
				}).catch((err) => {
					uni.hideLoading();
					console.error(err);
				});
			},

			mediaError(type, url) {
				console.error(`❌ ${type} 加载失败:`, url);
			},
			lookImg(url) {
				uni.previewImage({
					urls: [url]
				});
			},

			goList() {
				this.page_type = 'list';
				this.$nextTick(() => {
					window.scrollTo(0, this.scrollPosition);
				});
			},
		}
	}
</script>

<style lang="scss" scoped>
	page {
		background: #F5F5F5;
	}

	/* 视频样式 */
	.news-video {
		width: 100%;
		border-radius: 8rpx;
		margin-bottom: 40rpx;
	}

	/* 媒体容器样式 (图片) */
	.media-container {
		width: 100%;
		margin-bottom: 40rpx;
		display: flex;
		flex-direction: column;
		gap: 20rpx;

		.media-item {
			width: 100%;
			position: relative;

			image {
				width: 100% !important;
				border-radius: 8rpx;
				display: block;
			}
		}
	}

	/*  电脑端样式 */
	@media (min-width: 769px) {
		.pageBox {
			width: 100vw;

			.tabBox {
				width: 66vw;
				max-width: 4000rpx;
				gap: 10vw;

				.text_true {
					cursor: pointer;
					font-weight: bold;
					font-size: 0.94vw;
					color: #E62402;
					margin-top: 0.66vw;
					margin-bottom: 0.83vw;
				}

				.text_false {
					cursor: pointer;
					font-weight: 400;
					font-size: 0.94vw;
					color: #1F1111;
					margin-top: 0.66vw;
					margin-bottom: 0.83vw;
				}

				.line_true {
					cursor: pointer;
					width: 1.67vw;
					height: 0.1vw;
					background: #E62402;
				}

				.line_false {
					cursor: pointer;
					width: 1.67vw;
					height: 0.1vw;
					background: none;
				}
			}

			.tabLine {
				width: 100vw;
				height: 1rpx;
				background: #E62402;
				margin-bottom: 1vw;
			}

			.listBox {
				width: 66vw;
				max-width: 4000rpx;

				.itemBox {
					width: 15.63vw;
					border-radius: 10rpx;
					margin-bottom: 1vw;

					.image {
						width: 100%;
						height: 8.79vw;
						display: block;
						border-radius: 10rpx 10rpx 0 0;
					}

					.nameBox {
						background: #FFFFFF;
						padding: 0.57vw 0.78vw;
						box-sizing: border-box;
						border-radius: 0 0 10rpx 10rpx;

						.name {
							font-size: 1.04vw;
							color: #333333;
							margin-bottom: 1.3vw;
						}

						.text1 {
							width: 3.8vw;
							font-size: 0.83vw;
							color: #999999;
						}

						.text2 {
							width: 9.8vw;
							font-size: 0.83vw;
							color: #333333;
						}
					}
				}

				.itemBox:hover {
					.nameBox {
						box-shadow: 0px 0 52rpx 0px rgba(0, 0, 0, 0.25);

						.name {
							color: #E62402;
						}
					}
				}
			}

			.fwb {
				font-size: 1vw;
				color: #1F1F1F;
				margin-bottom: 4vw;
				line-height: 1.6;

				img {
					max-width: 100% !important;
					height: auto !important;
					display: block;
					margin: 10px 0;
				}
			}

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

				.titleBox {
					width: 52.08vw;
					max-width: 2700rpx;
				}

				.BigTitle {
					font-weight: 500;
					font-size: 1.67vw;
					color: #000000;
					margin-bottom: 1.88vw;
				}

				.text1 {
					width: 100%;
					font-weight: 500;
					font-size: 1.04vw;
					color: #999999;
					margin-top: 2.6vw;
				}

				.text2 {
					font-weight: 500;
					font-size: 1.04vw;
					color: #000000;
				}

				.heightBox {
					height: 6.3vw;
				}
			}
		}
	}

	/*  手机端样式 */
	@media (max-width: 768px) {
		.fwb {
			font-size: 28rpx;
			margin-bottom: 40rpx;
			line-height: 1.6;

			img {
				max-width: 100% !important;
				height: auto !important;
			}
		}

		.pageBox {
			width: 100vw;

			.tabBox {
				width: 700rpx;
				gap: 40rpx;

				.text_true {
					cursor: pointer;
					font-weight: bold;
					font-size: 28rpx;
					color: #E62402;
					margin-top: 10rpx;
					margin-bottom: 10rpx;
				}

				.text_false {
					cursor: pointer;
					font-weight: 400;
					font-size: 28rpx;
					color: #1F1111;
					margin-top: 10rpx;
					margin-bottom: 10rpx;
				}

				.line_true {
					cursor: pointer;
					width: 40rpx;
					height: 4rpx;
					background: #E62402;
				}

				.line_false {
					cursor: pointer;
					width: 40rpx;
					height: 4rpx;
					background: none;
				}
			}

			.tabLine {
				width: 100vw;
				height: 1rpx;
				background: #E62402;
				margin-bottom: 20rpx;
			}

			.listBox {
				width: 700rpx;

				.itemBox {
					width: 340rpx;
					border-radius: 10rpx;
					margin-bottom: 20rpx;

					.image {
						width: 100%;
						height: 220rpx;
						display: block;
						border-radius: 10rpx 10rpx 0 0;
					}

					.nameBox {
						background: #FFFFFF;
						padding: 12rpx;
						box-sizing: border-box;
						border-radius: 0 0 10rpx 10rpx;

						.name {
							font-size: 28rpx;
							color: #333333;
							margin-bottom: 10rpx;
							font-family: 900;
						}

						.text1 {
							width: 120rpx;
							font-size: 24rpx;
							color: #999999;
						}

						.text2 {
							width: 230rpx;
							font-size: 24rpx;
							color: #333333;
						}
					}
				}
			}

			.fwb {
				font-size: 28rpx;
				color: #1F1F1F;
				margin-bottom: 40rpx;
			}

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

				.titleBox {
					width: 700rpx;
				}

				.BigTitle {
					font-weight: bold;
					font-size: 34rpx;
					color: #1F1F1F;
					margin-bottom: 24rpx;
				}

				.text1 {
					width: 100%;
					font-weight: 500;
					font-size: 28rpx;
					color: #999999;
					margin-top: 12rpx;
				}

				.text2 {
					font-weight: 500;
					font-size: 28rpx;
					color: #000000;
				}

				.heightBox {
					height: 60rpx;
				}
			}
		}
	}

	.fwb {
		text-wrap: pretty;
	}
</style>
