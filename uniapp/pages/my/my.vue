<template>
	<view>
		<view class="custom-loading" v-if="showLoading">
			<view class="loading-box">
				<view class="loading-spinner"></view>
				<text>{{ loadingText }}</text>
			</view>
		</view>
		<!-- ========== 导入记录弹窗 ========== -->
		<view class="popup_box zzz3" v-if="popup" @click="popup = false">
			<view class="boxs" @click.stop>
				<!-- 弹窗头部 -->
				<view class='tops zzz2'>
					<view class='e2 w100b'>
						<text>导入记录</text>
						<image class='pointer'
							src='/static/local_assets/1759e29de538740388bbc49c.png'
							@click="popup = false" />
					</view>
				</view>
				<view class='e2 textXxs'>
					统计信息: 总记录数:{{results.attachments_missing}}，已处理: {{results.processed_rows}}，完成时间:{{completed_at}}
				</view>
				<view :class="$isPC?'e2 xinxiBox':'xinxiBox'">
					<view class='e1'>
						<view class='zzz3 itemNum' @click="console111">
							<view class='textN1' style="color: #00aa00;">{{results.success}}</view>
							<view class='textN2'>成功导入</view>
						</view>
						<view class='itemL'></view>
						<view class='zzz3 itemNum'>
							<view class='textN1' style="color: #ff0000;">{{results.failed}}</view>
							<view class='textN2'>导入失败</view>
						</view>
						<view class='itemL'></view>
						<view class='zzz3 itemNum'>
							<view class='textN1' style="color: #00aaff;">{{results.attachments_matched}}</view>
							<view class='textN2'>附件匹配</view>
						</view>
						<view class='itemL'></view>
						<view class='zzz3 itemNum'>
							<view class='textN1' style="color: #aaaaaa;">{{results.attachments_missing}}</view>
							<view class='textN2'>附件缺失</view>
						</view>
					</view>
					<view class='e1' v-if="$isPC">
						<view class='pointer zzz3'
							:style="{ backgroundColor: showSuccessList ? '#E62402' : '#F5F5F5', color: showSuccessList ? '#FFFFFF' : '#1F1F1F', padding: '8rpx 24rpx', borderRadius: '10rpx', marginRight: '20rpx' }"
							@click="switchList(true)">
							成功 ({{results.success}})
						</view>
						<view class='pointer zzz3'
							:style="{ backgroundColor: !showSuccessList ? '#E62402' : '#F5F5F5', color: !showSuccessList ? '#FFFFFF' : '#1F1F1F', padding: '8rpx 24rpx', borderRadius: '10rpx' }"
							@click="switchList(false)">
							失败 ({{results.failed}})
						</view>
					</view>
					<view class='e2' v-else>
						<view class=''></view>
						<view class='e1'>
							<view class='pointer zzz3'
								:style="{ backgroundColor: showSuccessList ? '#E62402' : '#F5F5F5', color: showSuccessList ? '#FFFFFF' : '#1F1F1F', padding: '8rpx 24rpx', borderRadius: '10rpx', marginRight: '20rpx' }"
								@click="switchList(true)">
								成功 ({{results.success}})
							</view>
							<view class='pointer zzz3'
								:style="{ backgroundColor: !showSuccessList ? '#E62402' : '#F5F5F5', color: !showSuccessList ? '#FFFFFF' : '#1F1F1F', padding: '8rpx 24rpx', borderRadius: '10rpx' }"
								@click="switchList(false)">
								失败 ({{results.failed}})
							</view>
						</view>
					</view>
				</view>


				<!-- 弹窗内容区 -->
				<view class='xinxilists'>
					<!-- 表头 -->
					<view class='popupToolBox isTop e2'>
						<view style='width:5%;text-align:center;' v-if="$isPC">行数</view>
						<view style='width:15%;text-align:center;'>姓名</view>
						<view style='width:15%;text-align:center;'>手机</view>
						<view style='width:10%;text-align:center;'>作品类型</view>
						<view style='width:35%;text-align:center;'>作品</view>
						<view style='width:20%;text-align:center;' v-if="$isPC">{{showSuccessList?'导入状态':'失败原因'}}</view>
					</view>

					<!-- 滚动列表 -->
					<scroll-view class="popup_listBox" scroll-y :show-scrollbar="true" @scrolltolower="loadMore">

						<view class='popupToolBox e2 pointer' :class="index % 2 === 0 ? 'isBottom1' : 'isBottom2'"
							v-for="(item, index) in displayList"
							:key="`${showSuccessList ? 's' : 'f'}-${currentPage}-${index}`">
							<view style='width:5%;text-align:center;' class='textsl1' v-if="$isPC">
								{{item.row_number}}
							</view>
							<view style='width:15%;text-align:center;' class='textsl1'>
								{{item.row_data[3]}}
							</view>
							<view style='width:15%;text-align:center;' class='textsl1'>
								{{item.row_data[6]}}
							</view>
							<view style='width:10%;text-align:center;' class='textsl1'>
								{{item.row_data[1]}}
							</view>
							<view style='width:35%;text-align:center;'>{{item.row_data[14]}}</view>
							<view style='width:20%;' class='zzz3' v-if="$isPC">
								<view class='e1'>
									<image class='TFimg'
										:src="showSuccessList ? '/static/local_assets/ba7adb953c4b1810d2b1f7e6.png' : '/static/local_assets/95321ea1f821cdd7a0a6dca9.png'" />
									<view>{{ showSuccessList ? '成功' : item.error||'失败' }}</view>
								</view>
							</view>
						</view>
					</scroll-view>
				</view>
			</view>
		</view>




		<!-- ========== 页面主体 ========== -->
		<topBox pageName='个人中心' :myInfo='myInfo'></topBox>

		<view class='pageBox zzz3'>
			<view class='myBox'>
				<!-- ========== 用户登录状态区域 ========== -->
				<view class='box1 e2' v-if="isLogin === true">
					<view class='e1'>
						<image class='tx-img pointer'
							src='/static/local_assets/707cd197a8fe332341e45e2f.png'
							v-if="myInfo.type==1" mode="aspectFill" style="object-fit: cover" />
						<image class='tx-img pointer'
							src='/static/local_assets/1106410218aec2651a995b77.png'
							v-if="myInfo.type==2" mode="aspectFill" style="object-fit: cover" />
						<view>
							<view class='text1'>{{maskString(myInfo.phone)}}</view>
							<view class='e1'>
								<view class='text2' v-if="myInfo.type==1">学生</view>
								<view class='text2' v-if="myInfo.type==2">学校</view>
								<view class='text3' v-if="myInfo.type==2">{{myInfo.name}}</view>
								<view class='text3' v-if="myInfo.type==2">
									<view style='color:#f00' v-if="myInfo.status==2">审核驳回</view>
									<view style='color:#00aa00' v-if="myInfo.status==0">审核通过</view>
									<view style='color:#959595' v-if="myInfo.status==1">审核中</view>
								</view>
								<image class='text4'
									src='/static/local_assets/1e99d02819cec90eafce8551.png'
									v-if="myInfo.status==0&&myInfo.type==2" />
							</view>
						</view>
					</view>
					<view class='button zzz3 pointer' @click="outLogin">
						<view class='e1'>
							<image src='/static/local_assets/3bf439722a581ab5deed0bcc.png' />
							<text>退出登录</text>
						</view>
					</view>
				</view>

				<!-- ========== 未登录时的快捷入口（仅移动端） ========== -->
				<view class='box1 zzz3' v-if="!$isPC && isLogin === false">
					<view class='e1'>
						<view class='view_d4g5 zzz3' style="background-color: #E8A664;" @click="gotoLogin(1)">
							<view class='e1'>
								<image src='/static/local_assets/ff1979846e4dcba92ce54f05.png' />
								<text>学校登录</text>
							</view>
						</view>
						<view class='view_d4g5 zzz3' style="background-color: #aaaa7f;" @click="gotoLogin(0)">
							<view class='e1'>
								<image src='/static/local_assets/6e64d659266b77033b15d22d.png' />
								<text>学生登录</text>
							</view>
						</view>
					</view>
				</view>

				<view :class="$isPC ? 'e22' : ''">

					<!-- ============左侧菜单列表============ -->
					<view class='box2 topbottom' v-if="$isPC">
						<view>
							<view :class="leftName === item ? 'tabT' : 'tabF'" v-for="(item, index) in tabList"
								:key="index" @click="goleftName(item)">
								{{ item }}
							</view>
						</view>
					</view>
					<scroll-view class="phoneTopBox mb24" scroll-x :show-scrollbar="true" v-else>
						<view class='e1 zyjj32'>
							<view class='zzz3' v-for="(item, index) in tabList" :key="index" @click="goleftName(item)">
								<view :class="leftName === item ? 'text_true' : 'text_false'">{{ item }}</view>
								<view :class="leftName === item ? 'line_true' : 'line_false'"></view>
							</view>
						</view>
					</scroll-view>


					<!-- ============右侧盒子大全============ -->
					<view>
						<view class='rightTopTitle e1'>
							<image class='image pointer'
								src='/static/local_assets/de6ec6b4ce0d2d1d9db89f22.png'
								@click="gotoBack"
								v-if="rightName=='作品上传'||rightName=='导入记录'||rightName=='参赛记录详情'||rightName=='导入记录详情'||rightName=='获奖记录列表'||rightName=='获奖记录详情'" />
							<view class='text'>{{leftName}}</view>
							<view class='text' v-if="rightName">-{{rightName}}</view>
						</view>

						<view class="box4" v-if="rightName == '个人资料'">
							<view class='codeBox'>
								<view class='inputs_all'>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">学生姓名</span></view>
										<view class='long_box zzz2'>
											<input class='input' type='text' v-model='stud_name' placeholder='请输入学生姓名'
												placeholder-style='color:#999999' />
										</view>
									</view>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">联系方式</span></view>
										<view class='long_box zzz2'>
											<input class='input' type='number' v-model='stud_phone'
												placeholder='请输入联系方式' placeholder-style='color:#999999' />
										</view>
									</view>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">性别</span></view>
										<view class='sexBox e1'>
											<view class='e1 pointer' @click="stud_sex=1">
												<image class='icon'
													src='/static/local_assets/4c13961eb4a95d2e91bf44b8.png'
													v-if='stud_sex==1' />
												<image class='icon'
													src='/static/local_assets/f5781ebba6ba4715e8294f13.png'
													v-else />
												<view class='text'>男</view>
											</view>
											<view class='e1 pointer' @click="stud_sex=2">
												<image class='icon'
													src='/static/local_assets/4c13961eb4a95d2e91bf44b8.png'
													v-if='stud_sex==2' />
												<image class='icon'
													src='/static/local_assets/f5781ebba6ba4715e8294f13.png'
													v-else />
												<view class='text'>女</view>
											</view>
										</view>
									</view>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">身份类型</span></view>
										<view class='sexBox e1'>
											<view class='e1 pointer' @click="stud_credential_type='身份证号'">{{stud_credential_type==='身份证号'?'●':'○'}} 身份证号</view>
											<view class='e1 pointer' @click="stud_credential_type='其他'">{{stud_credential_type==='其他'?'●':'○'}} 其他</view>
										</view>
									</view>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">证件号</span></view>
										<view class='long_box zzz2'>
											<input class='input' type='text' v-model='stud_idcard' placeholder='请输入证件号'
												placeholder-style='color:#999999' />
										</view>
									</view>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">所在省市</span></view>
										<picker @change="bindPickerChange2" :range="saiquList" range-key="name"
											:value="saiquList.findIndex(item => item.name == stud_citieName)">
											<view class='long_box zzz2'>
												<view class='input' v-if="stud_citieName">{{stud_citieName}}</view>
												<view class='input' v-else style="color:#999999">请选择所在省市</view>
											</view>
										</picker>
									</view>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">所在学校</span></view>
										<view class='long_box zzz2'>
											<input class='input' type='text' v-model='stud_school' placeholder='请输入所在学校'
												placeholder-style='color:#999999' />
										</view>
									</view>
								</view>
								<view class='buttonBox e1'>
									<view class='button0 pointer' @click="baocun_info">保存</view>
								</view>
							</view>
						</view>

						<view class="box4" v-if="rightName == '学校认证信息'">
							<view class='codeBox'>
								<view class='inputs_all'>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">学校名称</span></view>
										<view class='long_box zzz2'>
											<input class='input' type='text' v-model='schoolName' placeholder='请输入学校名称'
												placeholder-style='color:#999999' />
										</view>
									</view>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">学校联系人</span></view>
										<view class='long_box zzz2'>
											<input class='input' type='text' v-model='contact' placeholder='请输入学校联系人'
												placeholder-style='color:#999999' />
										</view>
									</view>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">联系方式</span></view>
										<view class='long_box zzz2'>
											<input class='input' type='number' v-model='phone' placeholder='请输入联系方式'
												placeholder-style='color:#999999' />
										</view>
									</view>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">所在省市</span></view>
										<picker @change="bindPickerChange2" :range="saiquList" range-key="name"
											:value="saiquList.findIndex(item => item.name == stud_citieName)">
											<view class='long_box zzz2'>
												<view class='input' v-if="stud_citieName">{{stud_citieName}}</view>
												<view class='input' v-else style="color:#999999">请选择所在省市</view>
											</view>
										</picker>
									</view>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">电子邮箱</span></view>
										<view class='long_box zzz2'>
											<input class='input' type='text' v-model='email' placeholder='请输入电子邮箱'
												placeholder-style='color:#999999' />
										</view>
									</view>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">统一社会信用代码</span></view>
										<view class='long_box zzz2'>
											<input class='input' type='text' v-model='schoolid'
												placeholder='请输入统一社会信用代码' placeholder-style='color:#999999' />
										</view>
									</view>
									<view class='e1'>
										<view class='leftText'>*<span style="color: #1F1F1F">事业单位法人证书</span></view>
										<view class='e1'>
											<image class='shnagcImg pointer'
												:src='businessLicenseUrl || "/static/local_assets/2f558ac9233fcc96d20c4d6e.png"'
												@click="uploadBusinessLicense" />
										</view>
									</view>
									<view class='e11'>
										<view class='leftText'>*<span style="color: #1F1F1F">参赛承诺书</span></view>
										<view class=''>
											<view class='e1'>
												<view :class="localFileType == 0?'choose1 pointer':'choose0 pointer'"
													@click="gofileType(0)">
													图片
												</view>
												<view :class="localFileType == 1?'choose1 pointer':'choose0 pointer'"
													@click="gofileType(1)">
													pdf
												</view>
											</view>

											<view :class="$isPC ? 'e1' : ''">
												<image v-if="localFileType == 0" class='shnagcImg pointer'
													:src='commitmentImgUrl || "/static/local_assets/2f558ac9233fcc96d20c4d6e.png"'
													@click="uploadCommitmentImage" />
												<view v-if="localFileType == 1"
													:class="$isPC ? 'long_box zzz2 pointer' : 'long_box zzz2 pointer mt22 mb22'"
													@click="uploadCommitmentPdf">
													<view class='input' v-if="commitmentPdfUrl">
														{{commitmentPdfName+' (点击更换)'||'点击上传'}}
													</view>
													<view class='input' style="color: #999;" v-else>点击上传</view>
												</view>
												<view class='Xiaotitle pointer'
													style="text-decoration: underline;color: #999;margin-left: 20px;"
													@click="viewFile(commitmentPdfUrl)"
													v-if="localFileType == 1&&commitmentPdfUrl">
													查看
												</view>
												<view class='Xiaotitle pointer'
													style="text-decoration: underline;color: #999;margin-left: 20px;"
													@click="downloadTemplate(link_url)">
													下载承诺书模板
												</view>
											</view>
										</view>
									</view>
									<!-- 
									status 0 审核通过
									status 1 待审核
									status 2 审核失败 
									-->
									<view class='e1' v-if="myInfo.status !== undefined">
										<view class='leftText'>审核状态：</view>
										<view class='e1'>
											<image class='shenhTub'
												src='/static/local_assets/932c184fa53b41cb7cafe72e.png'
												mode='widthFix' v-if="myInfo.status==0" />
											<image class='shenhTub'
												src='/static/local_assets/1b2e041664be582e808873b2.png'
												mode='widthFix' v-if="myInfo.status==1" />
											<image class='shenhTub'
												src='/static/local_assets/29ce51cd8a86eb58cd54c41c.png'
												mode='widthFix' v-if="myInfo.status==2" />
										</view>
									</view>
									<view class='e11' v-if="myInfo.status==2">
										<view class='leftText'>驳回原因：</view>
										<view class='long_box2 zzz2'>
											<view class='input'>{{rejectreason}}</view>
										</view>
									</view>
								</view>
								<view class='buttonBox e1' v-if="myInfo.status==0">
									<view class='button0 pointer' @click="renzheng_school">
										编辑
									</view>
								</view>
								<view class='buttonBox e1' v-if="myInfo.status==2">
									<view class='button0 pointer' @click="renzheng_school">
										重新提交
									</view>
								</view>
							</view>
						</view>

						<view class='box3' v-if="rightName == '赛事列表'">
							<view class='zzz3' v-if="myInfo.status==0">
								<view class='topshaiXuanBox e2'>
									<view class='e1'>
										<view class='boxinput_Box zzz3'>
											<view class='nbu e1'>
												<image
													src='/static/local_assets/c2cb45a5dcd5198e9ad465e1.png' />
												<input type='text' v-model='sousuoSsName' placeholder='搜索赛事名称'
													placeholder-style='color:#999999' @input="getcompetitionlists" />
											</view>
										</view>
										<picker @change="bindPickerChange1" :range="array1" range-key="name">
											<view class='boxinput_Box zzz3'>
												<view class='nbu e2'>
													<view class='choose_true' v-if="saishi_type">{{ saishi_type }}
													</view>
													<view class='choose_false' v-else>选择赛事状态</view>
													<image
														src='/static/local_assets/e89aec92a3ffb7e2a475c6d1.png' />
												</view>
											</view>
										</picker>
									</view>
								</view>
								<view class='topToolBox isTop e2'>
									<view style='width: 40%;text-align: left;'>赛事</view>
									<view style='width: 30%;text-align: center;'>状态</view>
									<view style='width: 30%;text-align: center;'>操作</view>
								</view>
								<scroll-view class="listBox3" scroll-y :show-scrollbar="true"
									:scroll-top="savedScrollTop" @scroll="onScroll">
									<view class='topToolBox isBottom e2 pointer'
										v-for="(item, index) in competition_lists" :key="index">
										<view style='width: 40%;text-align: left;' class='textsl1'>
											{{item.name}}
										</view>
										<view style='width: 30%;text-align: center'>
											<view class='color:#FF8800' v-if="myInfo.type==1">
												<view v-if="item.status==0">未开始</view>
												<view v-if="item.status==1">报名中</view>
												<view v-if="item.status==2">评审中</view>
												<view v-if="item.status==3">已结束</view>
												<view v-if="item.status==4">已关闭</view>
											</view>
											<view class='color:#FF8800' v-if="myInfo.type==2">
												<view>可报名</view>
											</view>
										</view>
										<view style='width: 30%;text-align: center;' class='xhx zzz3'>
											<view class='e1' v-if="leftName === '作品提交'">
												<view @click="goNext(item)" v-if="myInfo.status==0">点击报名</view>
												<view @click="showModal('用户正在审核')" v-else>点击报名</view>
											</view>
											<view class='e1' v-if="leftName=='参赛记录'">
												<view @click="goDrJl(item,null)">参赛记录</view>
											</view>
											<view class='e1' v-if="leftName=='获奖记录'">
												<view @click="lookHJJilv(item)">查看获奖记录</view>
											</view>
										</view>
									</view>
								</scroll-view>
							</view>
							<view class='codeBox zzz3' v-else>
								<image class='weidlImg' style="margin-top: 4vw"
									src='/static/local_assets/1106410218aec2651a995b77.png'
									mode="widthFix" />
								<view class='weidlText'>大赛组委会审核通过后，即可集体报名</view>
							</view>
						</view>

						<view class='box3 p24' v-if="rightName == '参赛记录列表'">
							<view class='topToolBox isTop e2'>
								<view style='text-align: left;'>赛事</view>
							</view>
							<scroll-view class="listBox1" scroll-y :show-scrollbar="true" ref="scrollView"
								:scroll-top="savedScrollTop" @scroll="onScroll" v-if="myInfo.type==1">
								<view :class="$isPC ? 'itemBox e2' : 'itemBox'" v-for="(item, index) in product_lists"
									:key="index" @click="goCsType('参赛记录详情', item)">
									<view :class="$isPC ? 'title textsl3' : 'title'">
										{{item.name}}
									</view>
									<view :class="$isPC ? 'itemxqBox e2' : 'e2 mt24'">
										<view class=''></view>
										<view class='e1'>
											<view class='text pointer' @click="goCsType('参赛记录详情', item)">参赛记录详情</view>
											<view class='ckBox pointer' @click="goCsType('参赛记录详情', item)">查看</view>
										</view>
									</view>
								</view>
								<view class=' zzz3' v-if="product_lists.length==0">
									<image class='weidlImg' style="margin-top: 4vw"
										src='/static/local_assets/3ae261911942bc8b0259d87a.png'
										mode="widthFix" />
									<view class='weidlText'>暂无数据</view>
								</view>
							</scroll-view>
						</view>

						<view class='box3 p24' v-if="rightName == '报名详情列表'">
							<!-- 赛事筛选下拉框 -->
							<view style="display:flex;align-items:center;margin-bottom:10px;">
								<text style="font-size:13px;color:#333;margin-right:8px;">筛选赛事：</text>
								<picker @change="onRegCompetitionFilter" :range="regCompetitionList" range-key="name">
									<view
										style="border:1px solid #ddd;border-radius:4px;padding:4px 12px;min-width:160px;font-size:13px;color:#333;background:#fff;cursor:pointer;">
										{{selectedRegCompetitionName || '全部赛事'}}
									</view>
								</picker>
								<text v-if="selectedRegCompetitionId"
									style="font-size:12px;color:#1890ff;margin-left:8px;cursor:pointer;"
									@click="clearRegCompetitionFilter">清除筛选</text>
							</view>
							<view class='topToolBox isTop e2'>
								<view style='width: 14%;text-align: left;'>赛事</view>
								<view style='width: 20%;text-align: left;'>作品名称</view>
								<view style='width: 8%;text-align: center;'>类型</view>
								<view style='width: 12%;text-align: center;'>学生信息</view>
								<view style='width: 18%;text-align: center;'>赛项/组别</view>
								<view style='width: 16%;text-align: center;'>指导老师</view>
								<view style='width: 12%;text-align: center;'>操作</view>
							</view>
							<scroll-view class="listBox4" scroll-y :show-scrollbar="true">
								<view class='topToolBox isBottom e2 pointer'
									v-for="(item, index) in schoolRegistrationDetails" :key="item.id || index">
									<view style='width: 14%;text-align: left;' class='textsl1'>
										{{item.competition_name || '-'}}
									</view>
									<view style='width: 20%;text-align: left;' class='textsl1'>
										{{item.title || item.purlname || '未填写作品名称'}}
									</view>
									<view style='width: 8%;text-align: center;' class='registration-detail-cell'>
										<text
											:style="{color: item.type_name == '团体' ? '#1890ff' : '#52c41a'}">{{item.type_name || '个人'}}</text>
										<view class='registration-student-sub'
											v-if="item.type_name == '团体' && item.team_members && item.team_members.length > 0">
											{{item.team_members.length}}人
										</view>
									</view>
									<view style='width: 12%;text-align: center;' class='registration-detail-cell'>
										<text class='registration-student-name'>{{item.username || '未填写姓名'}}</text>
									</view>
									<view style='width: 18%;text-align: center;' class='registration-detail-cell'>
										<view>{{item.firstcatid_name || item.major || ''}}</view>
										<view class='registration-student-sub' v-if="item.zubie">{{item.zubie}}</view>
									</view>
									<view style='width: 16%;text-align: center;' class='textsl1'>
										{{item.teachername || '-'}}
									</view>
									<view style='width: 12%;text-align: center;'>
										<text class='pointer' style='color:#1890ff;font-size:12px;'
											@click="showRegistrationDetail(item)">详情</text>
									</view>
								</view>
								<view class='zzz3' v-if="schoolRegistrationDetails.length==0">
									<image class='weidlImg' style="margin-top: 4vw"
										src='/static/local_assets/3ae261911942bc8b0259d87a.png'
										mode="widthFix" />
									<view class='weidlText'>暂无成功报名作品</view>
								</view>
							</scroll-view>
						</view>

						<!-- 报名详情弹窗 -->
						<view class="popup_box zzz3" v-if="showRegDetailPopup" @click="showRegDetailPopup = false">
							<view class="boxs" @click.stop style="max-width:700px;max-height:80vh;overflow-y:auto;">
								<view class='tops zzz2'>
									<view class='e2 w100b'>
										<text>报名详情</text>
										<image class='pointer'
											src='/static/local_assets/1759e29de538740388bbc49c.png'
											@click="showRegDetailPopup = false" />
									</view>
								</view>
								<view style="padding:20px;" v-if="regDetailItem">
									<view class='reg-detail-row'><text
											class='reg-detail-label'>作品名称：</text><text>{{regDetailItem.title || regDetailItem.purlname || '-'}}</text>
									</view>
									<view class='reg-detail-row'><text
											class='reg-detail-label'>类型：</text><text>{{regDetailItem.type_name || '个人'}}</text>
									</view>
									<view class='reg-detail-row'><text
											class='reg-detail-label'>学生姓名：</text><text>{{regDetailItem.username || '-'}}</text>
									</view>
									<view class='reg-detail-row'><text
											class='reg-detail-label'>联系电话：</text><text>{{regDetailItem.student_phone || regDetailItem.phone || '-'}}</text>
									</view>
									<view class='reg-detail-row'><text
											class='reg-detail-label'>赛事：</text><text>{{regDetailItem.competition_name || '-'}}</text>
									</view>
									<view class='reg-detail-row'><text
											class='reg-detail-label'>赛项：</text><text>{{regDetailItem.firstcatid_name || '-'}}</text>
									</view>
									<view class='reg-detail-row'><text
											class='reg-detail-label'>专业：</text><text>{{regDetailItem.secondcatid_name || regDetailItem.major || '-'}}</text>
									</view>
									<view class='reg-detail-row'><text
											class='reg-detail-label'>组别：</text><text>{{regDetailItem.zubie || '-'}}</text>
									</view>
									<view class='reg-detail-row'><text
											class='reg-detail-label'>赛区：</text><text>{{regDetailItem.regions || '-'}}</text>
									</view>
									<view class='reg-detail-row'><text
											class='reg-detail-label'>学校：</text><text>{{regDetailItem.school || '-'}}</text>
									</view>
									<view class='reg-detail-row'><text
											class='reg-detail-label'>指导老师：</text><text>{{regDetailItem.teachername || '-'}}</text>
									</view>
									<view class='reg-detail-row'><text
											class='reg-detail-label'>作品简介：</text><text>{{regDetailItem.description || '-'}}</text>
									</view>
									<view class='reg-detail-row' v-if="regDetailItem.purl">
										<text class='reg-detail-label'>附件：</text>
										<a :href="regDetailItem.purl" target="_blank"
											style="color:#1890ff;word-break:break-all;">{{regDetailItem.purlname || '查看附件'}}</a>
									</view>
									<!-- 团体成员 -->
									<view
										v-if="regDetailItem.type_name == '团体' && regDetailItem.team_members && regDetailItem.team_members.length > 0"
										style="margin-top:12px;">
										<text class='reg-detail-label' style="font-weight:bold;">团体成员：</text>
										<view v-for="(m, mi) in regDetailItem.team_members" :key="mi"
											style="padding:4px 0 4px 16px;font-size:13px;">
											{{mi + 1}}. {{m.name || '未知'}} <text v-if="m.idcard"
												style="color:#999;margin-left:8px;">{{m.idcard}}</text>
										</view>
									</view>
								</view>
							</view>
						</view>

						<view class="box4" v-if="rightName == '作品上传'">
							<view class='codeBox' v-if="competition_lists.length>0">
								<view class='inputs_all'>
									<view class='e1' v-if="myInfo.type == 1">
										<view class='leftText'>*<span style="color: #1F1F1F">类型</span></view>
										<view class='sexBox e1' style="margin-left: 0;">
											<view class='e1 pointer' @click="istuandui = 0">
												<image class='icon'
													src='/static/local_assets/4c13961eb4a95d2e91bf44b8.png'
													v-if='istuandui == 0' />
												<image class='icon'
													src='/static/local_assets/f5781ebba6ba4715e8294f13.png'
													v-else />
												<view class='text'>个人</view>
											</view>
											<view class='e1 pointer' @click="istuandui = 1">
												<image class='icon'
													src='/static/local_assets/4c13961eb4a95d2e91bf44b8.png'
													v-if='istuandui == 1' />
												<image class='icon'
													src='/static/local_assets/f5781ebba6ba4715e8294f13.png'
													v-else />
												<view class='text'>团体</view>
											</view>
										</view>
									</view>
									<view class='e1' v-if="myInfo.type == 1">
										<view class='leftText'>*<span style="color: #1F1F1F">赛事</span></view>
										<picker @change="bind_saiS" :range="competition_lists" range-key="name">
											<view class='long_box zzz2 pointer'>
												<view class='e2 w100b'>
													<view class='input' v-if="saishiName">{{ saishiName }}
													</view>
													<view class='input' v-else style="color: #999">请选择赛事</view>
													<image class='icon'
														src='/static/local_assets/de02f8223a010b32f733b0e2.png' />
												</view>
											</view>
										</picker>
									</view>
									<view class='e1' v-if="myInfo.type == 1">
										<view class='leftText'>*<span style="color: #1F1F1F">作品标题</span></view>
										<view class='long_box zzz2'>
											<input class='input' type='text' v-model='title' placeholder='请输入作品标题'
												placeholder-style='color:#999999' />
										</view>
									</view>
									<view class='e1' v-if="myInfo.type == 1 && saishiName">
										<view class='leftText'>*<span style="color: #1F1F1F">赛项</span></view>
										<picker @change="bind_saiX" :range="saiXList" range-key="name">
											<view class='long_box zzz2 pointer'>
												<view class='e2 w100b'>
													<view class='input' v-if="firstcatname">{{ firstcatname }}</view>
													<view class='input' v-else style="color: #999">请选择赛项</view>
													<image class='icon'
														src='/static/local_assets/de02f8223a010b32f733b0e2.png' />
												</view>
											</view>
										</picker>
									</view>
									<view class='e1' v-if="myInfo.type == 1 && firstcatid">
										<view class='leftText'>*<span style="color: #1F1F1F">专业</span></view>
										<picker @change="bindPickerChange3" :range="zyList" range-key="name">
											<view class='long_box zzz2 pointer'>
												<view class='e2 w100b'>
													<view class='input' v-if="major">{{ major }}</view>
													<view class='input' v-else style="color: #999">请选择专业</view>
													<image class='icon'
														src='/static/local_assets/de02f8223a010b32f733b0e2.png' />
												</view>
											</view>
										</picker>
									</view>
									<view class='e1' v-if="myInfo.type == 1">
										<view class='leftText'>*<span style="color: #1F1F1F">赛区</span></view>
										<picker @change="bind_saiQ" :range="saiQList" range-key="name">
											<view class='long_box zzz2 pointer'>
												<view class='e2 w100b'>
													<view class='input' v-if="regionsname">{{ regionsname }}</view>
													<view class='input' v-else style="color: #999">请选择赛区</view>
													<image class='icon'
														src='/static/local_assets/de02f8223a010b32f733b0e2.png' />
												</view>
											</view>
										</picker>
									</view>
									<view class='e1' v-if="myInfo.type == 1 && istuandui == 0">
										<view class='leftText'>*<span style="color: #1F1F1F">年龄组别</span></view>
										<picker @change="bind_zuBie" :range="zbList" range-key="name">
											<view class='long_box zzz2 pointer'>
												<view class='e2 w100b'>
													<view class='input' v-if="zubie">{{ zubie }}</view>
													<view class='input' v-else style="color: #999">请选择年龄组别</view>
													<image class='icon'
														src='/static/local_assets/de02f8223a010b32f733b0e2.png' />
												</view>
											</view>
										</picker>
									</view>
									<view class='e1' v-if="myInfo.type == 1">
										<view class='leftText'><span style="color: #1F1F1F">指导教师</span></view>
										<view class='long_box zzz2'>
											<input class='input' type='text' v-model='teachername' placeholder='请输入指导教师'
												placeholder-style='color:#999999' />
										</view>
									</view>
									<view class='e1' v-if="myInfo.type == 1">
										<view class='leftText'><span style="color: #1F1F1F">指导教师电话</span></view>
										<view class='long_box zzz2'>
											<input class='input' type='text' v-model='phone' placeholder='请输入指导教师电话'
												placeholder-style='color:#999999' />
										</view>
									</view>
									<view class='e1' v-if="myInfo.type == 1">
										<view class='leftText'>*<span style="color: #1F1F1F">附件类型</span></view>
										<view class='sexBox e1' style="margin-left:0;">
											<view class='e1 pointer' @click="setAttachmentMode('ZIP')">{{attachmentMode==='ZIP'?'●':'○'}} ZIP压缩包</view>
											<view class='e1 pointer' @click="setAttachmentMode('LINK')">{{attachmentMode==='LINK'?'●':'○'}} 链接</view>
										</view>
									</view>
									<view class='e1' v-if="myInfo.type == 1 && attachmentMode === 'ZIP'">
										<view class='leftText marginBottom'><span v-if="fujian">*</span><span style="color: #1F1F1F">作品ZIP</span>
										</view>
										<view class='leftText2 marginBottom e1' v-if='purl'>
											<view class='pointer' style="text-decoration:underline;" @click="goUrl(purl)">{{purlname}}</view>
											<view class='pointer'
												style="margin-left: 10rpx;text-decoration: underline;color: #ff0000;"
												@click='chooseWj'>更换</view>
										</view>
										<view class='codeText pointer' @click='chooseWj' v-else>点击选择ZIP文件</view>
									</view>
									<view class='e11' v-if="myInfo.type == 1">
										<view class='leftText'>*<span style="color: #1F1F1F">作品简介</span></view>
										<view class='long_box zzz3' style="height: 400rpx;">
											<textarea class='input' style="height: 360rpx;" type='text'
												v-model='description' placeholder='请输入作品简介'
												placeholder-style='color:#999999' maxlength="-1" />
										</view>
									</view>
									<view :class="$isPC ? 'e11' : ''" v-if="myInfo.type == 1 && istuandui == 1">
										<view class='leftText'>*<span style="color: #1F1F1F">团体成员</span></view>
										<view class='member-list-container'>
											<view class='member-item' v-for="(item, index) in teamMembers" :key="index">
												<view class='e2 w100b mb30'>
													<view class='member-index'>成员{{ index + 1 }}</view>
													<view class='delete-btn' v-if="teamMembers.length > 1"
														@click="removeMember(index)">
														<text class='iconfont'>-</text> 删除
													</view>
												</view>
												<view class='member-inputs'>
													<view class='input-group e2'>
														<text class='input-label'>姓名</text>
														<input class='member-input' type='text' v-model='item.name'
															placeholder='请输入姓名' placeholder-style='color:#cccccc' />
													</view>
													<view class='input-group e2'>
														<text class='input-label'>性别</text>
														<view class='sexBox e2 w100b' style="margin: 0;flex: 1;">
															<view class='e1 ml10'>
																<view class='e1 pointer' @click="item.sex=1">
																	<image class='icon'
																		src='/static/local_assets/4c13961eb4a95d2e91bf44b8.png'
																		v-if='item.sex==1' />
																	<image class='icon'
																		src='/static/local_assets/f5781ebba6ba4715e8294f13.png'
																		v-else />
																	<view class='text'>男</view>
																</view>
																<view class='e1 pointer' @click="item.sex=2">
																	<image class='icon'
																		src='/static/local_assets/4c13961eb4a95d2e91bf44b8.png'
																		v-if='item.sex==2' />
																	<image class='icon'
																		src='/static/local_assets/f5781ebba6ba4715e8294f13.png'
																		v-else />
																	<view class='text'>女</view>
																</view>
															</view>
															<view class=''></view>
														</view>
													</view>
													<view class='input-group e2'>
														<text class='input-label'>身份类型</text>
														<view class='sexBox e2 w100b' style="margin: 0;flex: 1;">
															<view class='e1 pointer' @click="item.credential_type='身份证号'">{{item.credential_type==='身份证号'?'●':'○'}} 身份证号</view>
															<view class='e1 pointer' @click="item.credential_type='其他'">{{item.credential_type==='其他'?'●':'○'}} 其他</view>
														</view>
													</view>
													<view class='input-group e2'>
														<text class='input-label'>证件号</text>
														<input class='member-input' type='text' v-model='item.idcard'
															placeholder='请输入证件号' placeholder-style='color:#cccccc' />
													</view>
													<view class='input-group e2'>
														<text class='input-label'>手机号</text>
														<input class='member-input' type='number' v-model='item.phone'
															placeholder='请输入手机号' placeholder-style='color:#cccccc' />
													</view>
													<view class='input-group e2'>
														<text class='input-label'>学校</text>
														<input class='member-input' type='text' v-model='item.school'
															placeholder='请输入该成员所在学校' placeholder-style='color:#cccccc' />
													</view>
													<view class='input-group e2'>
														<text class='input-label'>组别</text>
														<picker style="flex:1" @change="bindMemberGroup($event,index)" :range="zbList" range-key="name">
															<view class='member-input'>{{ item.group || '请选择后台配置的组别' }}</view>
														</picker>
													</view>
												</view>
											</view>
											<view class='add-member-btn' @click="addMember">
												<text class='plus-icon'>+</text> 添加成员
											</view>
										</view>
									</view>
									<view class='e11' v-if="myInfo.type == 1 && attachmentMode === 'LINK'">
										<view class='leftText'><span v-if="fujian">*</span><span style="color: #1F1F1F">作品链接</span></view>
										<view class='long_box zzz2' style="height: 400rpx;">
											<textarea class='input' style="height: 360rpx;" type='text' v-model='purl'
												placeholder='请输入作品百度网盘链接 (示例链接：https://pan.baidu.com/s/1TVAYYuK-Vb67EYGhVp1SKA?pwd=666)'
												placeholder-style='color:#999999' maxlength="-1" />
										</view>
									</view>


									<view v-if="myInfo.type == 2" :class="$isPC ? 'jianju_pc' : 'jianju_phone'">
										<view class='saishiText'>{{saishiName}}</view>
										<view class='e1'>
											<view class='leftText'>*<span style="color: #1F1F1F">赛项</span></view>
											<picker @change="bind_scolssaiX" :range="saiXList" range-key="name">
												<view class='long_box zzz2 pointer'>
													<view class='e2 w100b'>
														<view class='input' v-if="firstcatname">{{ firstcatname }}
														</view>
														<view class='input' v-else style="color: #999">请选择赛项</view>
														<image class='icon'
															src='/static/local_assets/de02f8223a010b32f733b0e2.png' />
													</view>
												</view>
											</picker>
										</view>
										<view v-if='firstcatid==1'>
											<view class='e1'>
												<view class='leftText'>*<span style="color: #1F1F1F">作品ZIP文件上传</span>
												</view>
												<view class='codeText pointer' v-if="!zip_id" @click="codeZIP">
													点击上传
												</view>
												<view class='jdtBox' v-if='zipProgress>0'>
													<view class='is_jdt' :style="{ width: zipProgress + '%' }"></view>
												</view>
											</view>
											<view class='codeInfoBox' v-if="zip_id">
												<view class='text1'>
													导入成功（{{zip_name}}）
													<span class='text2'>100%</span>
													<span class='text3 pointer' @click="yichuwenjian(1)">移除文件</span>
												</view>
											</view>
										</view>
										<view v-if="firstcatid!=''">
											<view class='e1'>
												<view class='leftText'>*<span style="color: #1F1F1F">作品Execl文件上传</span>
												</view>
												<view class='codeText pointer' v-if="!execl_id" @click="codeExecl">
													点击上传
												</view>
												<view class='jdtBox' v-if='excelProgress>0'>
													<view class='is_jdt' :style="{ width: excelProgress + '%' }"></view>
												</view>
												<view class='mobanText pointer'
													@click="downloadTemplate(excel_moban_url)">
													下载模板
												</view>
											</view>
											<view class='codeInfoBox' v-if="execl_id">
												<view class='text1'>
													导入成功（{{execl_name}}）
													<span class='text2'>100%</span>
													<span class='text3 pointer' @click="yichuwenjian(2)">移除文件</span>
												</view>
											</view>
										</view>
									</view>
								</view>
								<view class='buttonBox e1' v-if="myInfo.type==1">
									<view class='button1 pointer' @click="queren">
										提交
									</view>
								</view>
								<view class='buttonBox e1' v-if="myInfo.type==2">
									<view class='button1 pointer' @click="queren" v-if="myInfo.status==0">
										提交
									</view>
									<view class='button2 pointer' @click="noBaoMing" v-else>提交</view>
								</view>
							</view>
							<view class='codeBox zzz3' v-else>
								<image class='weidlImg' style="margin-top: 4vw"
									src='/static/local_assets/707cd197a8fe332341e45e2f.png'
									mode="widthFix" />
								<view class='weidlText'>当前没有可以报名的赛事</view>
							</view>
						</view>

						<view class='box3 zzz3' v-if="rightName == '导入记录'&&myInfo.type==1">
							<view class='topToolBox isTop e2'>
								<view style='width: 25%;text-align: left;'>作品标题</view>
								<view style='width: 5%;text-align: center;'>类型</view>
								<view style='width: 10%;text-align: center;'>参赛者</view>
								<view style='width: 20%;text-align: center;'>电话</view>
								<view style='width: 20%;text-align: center;'>教师姓名</view>
								<view style='width: 20%;text-align: center;'>操作</view>
							</view>
							<scroll-view class="listBox3" scroll-y :show-scrollbar="true" :scroll-top="savedScrollTop"
								@scroll="onScroll" @scrolltolower="loadMoreDrjl">
								<view class='topToolBox isBottom e2 pointer' v-for="(item, index) in displayedDrjlList"
									:key="index">
									<view style='width: 25%;text-align: left;' class='textsl1'>
										{{item.title}}
									</view>
									<view style='width: 5%;text-align: center;' class='textsl1'>
										<view v-if="item.teantype==0">
											个人
										</view>
										<view v-if="item.teantype==1">
											团体
										</view>
									</view>
									<view style='width: 10%;text-align: center;' class='textsl1'>
										{{item.username}}
									</view>
									<view style='width: 20%;text-align: center;' class='textsl1'>
										{{item.phone}}
									</view>
									<view style='width: 20%;text-align: center;' class='textsl1'>
										{{item.teachername}}
									</view>
									<view style='width: 20%;text-align: center;' class='xhx zzz3'>
										<view @click="golookxq1(item,null)">查看详情</view>
									</view>
								</view>
							</scroll-view>
						</view>

						<view class='box3 zzz3' v-if="rightName == '导入记录'&&myInfo.type==2">
							<view class='tiaoshuText'>
								Tips：<span style="color: red;">失败任务请完善失败记录后重新上传整个文件。</span>
							</view>
							<view class='topToolBox isTop e2'>
								<view style='width: 15%;text-align: left;'>zip压缩包</view>
								<view style='width: 15%;text-align: left;'>excel文件</view>
								<view style='width: 8%;text-align: center;'>总条数</view>
								<view style='width: 8%;text-align: center;'>成功条数</view>
								<view style='width: 8%;text-align: center;'>失败条数</view>
								<view style='width: 8%;text-align: center;'>状态</view>
								<view style='width: 20%;text-align: center;'>上传时间</view>
								<view style='width: 20%;text-align: center;'>操作</view>
							</view>
							<scroll-view class="listBox4" scroll-y :show-scrollbar="true" :scroll-top="savedScrollTop"
								@scroll="onScroll" @scrolltolower="loadMoreDrjl">
								<view class='topToolBox isBottom e2 pointer' v-for="(item, index) in displayedDrjlList"
									:key="index">
									<view style='width: 15%;text-align: left;text-decoration: underline;'
										class='textsl1' @click="downloadTemplate(item.oss_zip_url)">
										{{item.zip_name}}
									</view>
									<view style='width: 15%;text-align: left;text-decoration: underline;'
										class='textsl1' @click="downloadTemplate(item.oss_excel_url)">
										{{item.excel_name}}
									</view>
									<view style='width: 8%;text-align: center;' class='textsl1'>
										{{item.total_rows}}
									</view>
									<view style='width: 8%;text-align: center;' class='textsl1'>
										{{item.success_count}}
									</view>
									<view style='width: 8%;text-align: center;' class='textsl1'>
										{{item.failed_count}}
									</view>
									<view style='width: 8%;text-align: center;' class='textsl1'>
										<view v-if="item.status==0">待处理</view>
										<view v-if="item.status==1">处理中</view>
										<view v-if="item.status==2">成功</view>
										<view v-if="item.status==3">失败</view>
									</view>
									<view style='width: 20%;text-align: center;' class='textsl1'>
										{{item.create_ad}}
									</view>
									<view style='width: 20%;text-align: center;' class='xhx zzz3'>
										<view @click="golookxq2(item)">查看详情</view>
									</view>
								</view>
							</scroll-view>
						</view>

						<view class="box3 zzz3" v-if="rightName == '导入记录详情'">
							<view class='tiaoshuText'>
								总条数<span class='bold' style='color:#222;1'>{{DiaoD.total_rows}}</span>
								条，成功<span class='bold' style='color:#0a0;1'>{{DiaoD.success_count}}</span>
								条，失败<span class='bold' style='color:#f00;1'>{{DiaoD.failed_count}}</span>
								条
							</view>
							<view class='topToolBox isTop e2'>
								<view style='width: 4%;text-align: center;'>序号</view>
								<view style='width: 7%;text-align: center;'>类型</view>
								<view style='width: 10%;text-align: center;'>姓名</view>
								<view style='width: 4%;text-align: center;'>性别</view>
								<view style='width: 22%;text-align: center;' v-if="$isPC">身份证</view>
								<view style='width: 10%;text-align: center;' v-if="$isPC">电话</view>
								<view style='width: 24%;text-align: center;'>作品</view>
								<view style='width: 9%;text-align: center;'>状态</view>
								<view style='width: 10%;text-align: center;'>操作</view>
							</view>
							<scroll-view class="listBox4" scroll-y :show-scrollbar="true" :scroll-top="savedScrollTop"
								@scroll="onScroll" @scrolltolower="loadMoreDrjl">
								<view class='topToolBox isBottom e2 pointer' v-for="(item, index) in daoruJiLvList"
									:key="index">
									<view style='width: 4%;text-align: center;'>
										{{item.col_a}}
									</view>
									<view style='width: 7%;text-align: center;'>
										{{item.col_b}}
									</view>
									<view style='width: 10%;text-align: center;'>
										{{item.col_d}}
									</view>
									<view style='width: 4%;text-align: center;'>
										{{item.col_e}}
									</view>
									<view style='width: 22%;text-align: center;' v-if="$isPC">
										{{item.col_f}}
									</view>
									<view style='width: 10%;text-align: center;' v-if="$isPC">
										{{item.col_g}}
									</view>
									<view style='width: 24%;text-align: center;text-decoration: underline;'
										@click="goUrl(item.col_s)" class="textsl1">
										{{item.col_o}}
									</view>
									<view style='width: 9%;text-align: center;' class="zzz3">
										<view v-if="item.status==1" style='color:#00aa00;'>成功</view>
										<view v-if="item.status==2" style='color:#999999;'>失败</view>
										<view v-if="item.status==2" class="pointer"
											style="text-decoration: underline;color: #F00;"
											@click="chakyuanyin(item.error_msg)">查看原因</view>
									</view>
									<view style='width: 10%;text-align: center;' class='xhx zzz3'>
										<view @click="golookxq1(item,daoruJiLvCompetitionid)" v-if="item.product_id">
											查看详情</view>
										<view v-else></view>
									</view>
								</view>
								<view class='zzz3' v-if="daoruJiLvList.length==0">
									<image class='weidlImg' style="margin-top: 4vw"
										src='/static/local_assets/3ae261911942bc8b0259d87a.png'
										mode="widthFix" />
									<view class='weidlText'>暂无数据</view>
								</view>
							</scroll-view>
						</view>

						<view class="box4 topbottom" v-if="rightName == '参赛记录详情'">
							<view class='wuxianBox zzz3' style="min-height: 30vw;">
								<uni-steps :options="list1" :active="active" active-color=' #ff1111' />
								<view class='top'>{{msgmsgmsg}}</view>
								<view class='sxjjjjj'>
									<view class='e11' v-if="productDetail.initial_review_comment">
										<view class='zuo'>驳回原因</view>
										<view class='you' style="color:#F00">
											{{ productDetail.initial_review_comment }}
										</view>
									</view>
									<view class='e11'>
										<view class='zuo'>作品标题</view>
										<view class='you'>{{ productDetail.title || '—' }}
										</view>
									</view>
									<view class='e11'>
										<view class='zuo'>组别</view>
										<view class='you'>{{ productDetail.zubie || '—' }}
										</view>
									</view>
									<view class='e11'>
										<view class='zuo'>赛项</view>
										<view class='you'>
											{{ productDetail.firstcatid_name}}-{{ productDetail.secondcatid_name}}
										</view>
									</view>
									<view class='e11'>
										<view class='zuo'>专业</view>
										<view class='you'>
											{{ productDetail.major || '—' }}
										</view>
									</view>
									<view class='e11'>
										<view class='zuo'>赛区</view>
										<view class='you'>{{ productDetail.region_name || '—' }}</view>
									</view>
									<view class='e11'>
										<view class='zuo'>指导教师</view>
										<view class='you'>{{ productDetail.teachername || '—' }}</view>
									</view>
									<view class='e11'>
										<view class='zuo'>联系电话</view>
										<view class='you'>{{ productDetail.phone || '—' }}</view>
									</view>
									<view class='e11'>
										<view class='zuo'>作品附件</view>
										<view class='you pointer' style="text-decoration: underline;"
											@click="goUrl(productDetail.purl)">
											《{{productDetail.purlname}}》
										</view>
									</view>
									<view class='e11'>
										<view class='zuo'>作品简介</view>
										<view class='you'>{{ productDetail.description || '—' }}</view>
									</view>
									<view class='e11' v-if="productDetail.teantype==0">
										<view class='zuo'>参赛类型</view>
										<view class='you pointer' v-if="productDetail.teantype==0">个人</view>
										<view class='you pointer' v-if="productDetail.teantype==1">团体</view>
									</view>
									<view :class="$isPC ? 'e11' : ''" v-if="productDetail.teantype==1">
										<view class='zuo mb22'>团体成员</view>
										<view :class="$isPC ? 'you' : 'you2'">
											<view class='team-table'>
												<view class='table-header'>
													<view class='th' style='width:12%'>姓名</view>
													<view class='th' style='width:12%'>身份类型</view>
													<view class='th' style='width:24%'>证件号</view>
													<view class='th' style='width:16%'>电话</view>
													<view class='th' style='width:22%'>学校</view>
													<view class='th' style='width:14%'>组别</view>
												</view>
												<view class='table-row' v-for="(member, index) in productTeam"
													:key="index">
													<view class='td' style='width:12%'>{{ member.name }}</view>
													<view class='td' style='width:12%'>{{member.credential_type==='OTHER'?'其他':'身份证号'}}</view>
													<view class='td' style='width:24%'>{{member.idcard}}</view>
													<view class='td' style='width:16%'>{{member.phone}}</view>
													<view class='td' style='width:22%'>{{member.school}}</view>
													<view class='td' style='width:14%'>{{member.group}}</view>
												</view>
												<view
													v-if="!(productDetail.team && productDetail.team.length) && !(teamMembers && teamMembers.length)"
													class='no-data'>
													暂无团体成员信息
												</view>
											</view>
										</view>
									</view>
								</view>
							</view>
						</view>

						<view class='box3 zzz3' v-if="rightName == '获奖记录列表'">
							<view class='topToolBox isTop e2'>
								<view style='width: 40%;text-align: left;'>作品名称</view>
								<view style='width: 30%;text-align: center;'>学生姓名</view>
								<view style='width: 30%;text-align: center;'>操作</view>
							</view>
							<scroll-view class="listBox2" scroll-y :show-scrollbar="true" :scroll-top="savedScrollTop"
								@scroll="onScroll">
								<view class='topToolBox isBottom e2 pointer' v-for="(item, index) in huojiangjilvList"
									:key="index" @click="goHjType('详情',item)">
									<view style='width: 40%;text-align: left;' class='textsl1'>
										{{item.product_info.title}}
									</view>
									<view style='width: 30%;text-align: center;'>{{item.product_info.username}}</view>
									<view style='width: 30%;text-align: center;' @click="goHjType('详情',item)">查看</view>
								</view>
								<view class='zzz3' v-if="huojiangjilvList.length==0">
									<image class='weidlImg' style="margin-top: 4vw"
										src='/static/local_assets/3ae261911942bc8b0259d87a.png'
										mode="widthFix" />
									<view class='weidlText'>暂无数据</view>
								</view>
							</scroll-view>
						</view>

						<view class="box4 topbottom" v-if="rightName == '获奖记录详情'">
							<view :class="$isPC ? 'boxBottom zzz2' : 'boxBottom'">
								<view :class="$isPC ? 'zzz3 pl30 pr30 w100b' : 'zzz3 w100b'">
									<view class='e1'>
										<view class='zzz3'
											v-if="guoCertificateVisible&&hjjlDatas.guoaward&&hjjlDatas.guoaward.image&&hjjlDatas.guoaward.status!=0">
											<image class='hjImg pointer' :src="hjjlDatas.guoaward.image"
												mode="heightFix" @click="lookImg(hjjlDatas.guoaward.image)"
												v-if="hjjlDatas.guoaward.award!='未获奖'" />
											<view class='text1 textsl1'>总决赛奖项：{{hjjlDatas.guoaward.award}}</view>
										</view>
										<view class='zzz3'
											v-if="shengCertificateVisible&&hjjlDatas.shengaward&&hjjlDatas.shengaward.image&&hjjlDatas.shengaward.status!=0">
											<image class='hjImg pointer' :src="hjjlDatas.shengaward.image"
												mode="heightFix" @click="lookImg(hjjlDatas.shengaward.image)"
												v-if="hjjlDatas.shengaward.award!='未获奖'" />
											<view class='text1 textsl1'>复赛奖项：{{hjjlDatas.shengaward.award}}</view>
										</view>
									</view>
									<!-- <view class='hj-title-box zzz3' v-if="hjjlDatas.product_info">
										<view class='title'>学生姓名:{{hjjlDatas.product_info.username}}</view>
										<view class='title'>作品名称:{{hjjlDatas.product_info.title}}</view>
										<view class='title'>所在学校:{{hjjlDatas.product_info.school}}</view>
										<view class='title'>赛项:{{hjjlDatas.product_info.firstcatid_name}}</view>
										<view class='title'>专业:{{hjjlDatas.product_info.major}}</view>
										<view class='title'>指导教师:{{hjjlDatas.product_info.teachername}}</view>
										<view class='title pointer' style="text-decoration: underline;"
											@click="goUrl(hjjlDatas.product_info.purl)">
											作品附件:{{hjjlDatas.product_info.purlname}}
										</view>
									</view>
									<view class='hj-title-box zzz3' v-else>
										<view class='title'>️ {{hjjlDatas.title}} 未查询到奖项</view>
									</view> -->
									<view class='hj-title-box zzz3' v-if="!certificateVisible">
										证书查询暂未开放
									</view>
								</view>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>
		<bottomBox pageName='成绩查询' :configData="configData"></bottomBox>
	</view>
</template>

<script>
	import topBox from '@/components/topBox.vue';
	import bottomBox from '@/components/bottomBox.vue';
	import {
		uploadOss
	} from '@/util/upload.js'

	export default {
		components: {
			topBox,
			bottomBox
		},
		data() {
			return {
				configData: {},
				zipProgress: 0,
				excelProgress: 0,
				leftName: '',
				rightName: '',
				description: '',
				sousuoSsName: '',
				savedScrollTop: 0,
				currentScrollTop: 0,
				saiqu: '',
				isCode_ZIP: false,
				popup: false,
				myInfo: {},
				isLogin: false,
				status: '',
				saishi_type: '',
				zubie: '',
				fujian: '',
				attachmentMode: 'LINK',
				zbList: [],
				array1: [{
					name: '全部',
					value: ''
				}, {
					name: '报名中',
					value: 1
				}, {
					name: '已结束',
					value: 3
				}],
				product_lists: [],
				schoolRegistrationDetails: [],
				showRegDetailPopup: false,
				regDetailItem: null,
				regCompetitionList: [{
					name: '全部赛事',
					id: ''
				}],
				selectedRegCompetitionId: '',
				selectedRegCompetitionName: '',
				competition_lists: [],
				purlname: '',
				hjjlDatas: {},
				title: '',
				teachername: '',
				phone: '',
				purl: '',
				regionsid: '',
				regionsname: '',
				firstcatid: '',
				firstcatname: '',
				major: '',
				majorid: '',
				saishiId: '',
				saishiName: '',
				saiQList: [],
				saiXList: [],
				huojiangjilvList: [],
				saiquList: [],
				zip_id: '',
				zip_name: '',
				execl_id: '',
				execl_name: '',
				firstcategoryId: '',
				pollTimer1: null,
				pollTimer2: null,
				job_id: '',
				failed_rows: [],
				success_rows: [],
				results: {},
				completed_at: '',
				isBaoMing: 0,
				showSuccessList: true,
				currentPage: 1,
				pageSize: 50,
				hasMore: true,
				displayList: [], // 真正渲染的列表（滚动追加）
				productTeam: [],
				productDetail: {},
				daoruJiLvList: [],
				daoruJiLvCompetitionid: '',
				schoolName: '',
				contact: '',
				email: '',
				idcard: '',
				businessLicenseId: '',
				businessLicenseName: '',
				commitmentLetterId: '',
				businessLicenseUrl: '',
				commitmentLetterUrl: '',
				commitmentLetterName: '',
				commitmentImgUrl: '',
				commitmentPdfUrl: '',
				commitmentPdfName: '',
				lookXueXiaoType: 1,
				stud_name: '',
				stud_phone: '',
				stud_sex: '',
				stud_credential_type: '身份证号',
				stud_idcard: '',
				stud_cities: '',
				stud_citieName: '',
				stud_school: '',
				stud_schoolid: '',
				schoolid: '',
				rejectreason: '',
				link_url: '',
				excel_moban_url: '',
				zyList: [],
				DiaoD: {},
				istuandui: 0,
				list1: [{
					title: '审核'
				}, {
					title: '复赛'
				}, {
					title: '总决赛'
				}],
				msgmsgmsg: '',
				active: 1,
				daoruljList: [],
				drjlCurrentPage: 1,
				drjlPageSize: 10,
				drjlHasMore: true,
				displayedDrjlList: [],
				isZhuce: false,
				teamMembers: [{
					name: '',
					sex: '',
					credential_type: '身份证号',
					idcard: '',
					phone: '',
					school: '',
					group: ''
				}],
				productid: '',
				tupiantype: 0,
				localFileType: 0,
				showLoading: false, // 控制显示
				loadingText: '加载中...', // 文字
			};
		},
		computed: {
			certificateVisible() {
				return this.shengCertificateVisible || this.guoCertificateVisible;
			},
			shengCertificateVisible() {
				return String(this.configData.sheng_certificate_visibility || '0') === '1';
			},
			guoCertificateVisible() {
				return String(this.configData.guo_certificate_visibility || '0') === '1';
			},
			tabList() {
				if (this.myInfo.type == 1) {
					return ['个人信息', '作品提交', '参赛记录', '获奖记录'];
				}
				if (this.myInfo.type == 2) {
					return ['学校认证', '作品提交', '参赛记录', '报名详情', '获奖记录'];
				}
			},
			currentDrjlList() {
				const startIndex = (this.drjlCurrentPage - 1) * this.drjlPageSize;
				const endIndex = startIndex + this.drjlPageSize;
				return this.daoruljList.slice(startIndex, endIndex);
			}
		},
		onUnload() {
			// 页面销毁时移除监听（必须写）
			uni.$off('loadingComplete');
		},
		onLoad(e) {
			const loginInfo = uni.getStorageSync('loginInfo');
			if (!loginInfo || !loginInfo.access_token) {
				this.isLogin = false;
				uni.reLaunch({ url: '/pages/login/login' });
				return;
			}
			if (uni.getStorageSync('isZhuce')) {
				uni.removeStorageSync('isZhuce')
				this.isZhuce = true
			}
			if (uni.getStorageSync('goSaiXiangIndex')) {
				uni.removeStorageSync('goSaiXiangIndex')
			}
			this.getUserInfo()
			if (this.isLogin == true) {
				this.getproductlists()
				this.getsaiQ()
			}

			uni.$on('loadingComplete', () => {
				// 自动执行你的方法
				this.hideLoadingModal();
			});
		},
		onShow() {
			this.getTabber(this.$isPC);
			this.getlinkinfo()
			this.getzipinfo()
			this.GET({
				name: '赛区',
				url: '/api/competcategory/regions',
				data: {}
			}).then((res) => {
				this.saiquList = res.data.data
			});

			this.GET({
				name: '获取网站配置',
				url: '/api/product/getconfig',
				data: {}
			}).then((res) => {
				this.configData = res.data.data
			});

			setTimeout(() => {
				if (!this.myInfo || !this.myInfo.type) {
					console.log('❌❌❌❌没有this.myInfo')
					uni.reLaunch({
						url: '/pages/login/login'
					});
				} else {
					console.log('✅✅✅✅有this.myInfo')
				}
			}, 2000)
		},
		methods: {
			showLoadingModal(text = '加载中...') {
				this.showLoading = true
				this.loadingText = text
			},
			// 隐藏自定义加载
			hideLoadingModal() {
				console.log('✅ 页面方法已被 main.js 触发！');
				this.showLoading = false
			},
			gotoBack() {
				console.log('this.leftName', this.leftName)
				console.log('this.rightName', this.rightName)
				if (this.rightName == '作品上传') {
					this.leftName = '作品提交'
					this.rightName = '赛事列表'
					return
				}
				if (this.rightName == '导入记录') {
					this.leftName = '参赛记录'
					this.rightName = '赛事列表'
					return
				}
				if (this.rightName == '参赛记录详情' && this.myInfo.type == 1) {
					this.leftName = '参赛记录'
					this.rightName = '参赛记录列表'
					return
				}
				if (this.rightName == '参赛记录详情' && this.myInfo.type == 2) {
					this.leftName = '参赛记录'
					this.rightName = '导入记录详情'
					return
				}
				if (this.rightName == '导入记录详情') {
					this.leftName = '参赛记录'
					this.rightName = '导入记录'
					return
				}
				if (this.rightName == '获奖记录列表') {
					this.leftName = '获奖记录'
					this.rightName = '赛事列表'
					return
				}
				if (this.rightName == '获奖记录详情') {
					this.leftName = '获奖记录'
					this.rightName = '获奖记录列表'
					return
				}
			},
			addMember() {
				this.teamMembers.push({
					name: '',
					sex: '',
					credential_type: '身份证号',
					idcard: '',
					phone: '',
					school: '',
					group: ''
				});
			},
			bindMemberGroup(e, index) {
				const selected = this.zbList[e.detail.value];
				this.teamMembers[index].group = selected ? selected.name : '';
			},
			removeMember(index) {
				if (this.teamMembers.length <= 1) {
					uni.showToast({
						title: '至少保留一名成员',
						icon: 'none'
					});
					return;
				}
				uni.showModal({
					title: '提示',
					content: '确定要删除该成员吗？',
					success: (res) => {
						if (res.confirm) {
							this.teamMembers.splice(index, 1);
						}
					}
				});
			},
			getZy() {
				this.GET({
					name: '获取专业',
					url: '/api/competcategory/secondcategory?id=' + this.firstcatid + '&competition_id=' + this.saishiId,
					data: {}
				}).then((res) => {
					this.zyList = res.data.data
				});
			},
			getGroups() {
				if (!this.saishiId || !this.firstcatid) {
					this.zbList = [];
					return;
				}
				this.GET({
					name: '获取组别',
					url: `/api/competcategory/groups?competition_id=${this.saishiId}&firstcatid=${this.firstcatid}&secondcatid=${this.majorid || 0}`,
					data: {}
				}).then((res) => {
					this.zbList = res.data.data || [];
					if (this.zubie && !this.zbList.some(item => item.name === this.zubie)) this.zubie = '';
					this.teamMembers.forEach(member => {
						if (member.group && !this.zbList.some(item => item.name === member.group)) member.group = '';
					});
				});
			},
			getlinkinfo() {
				this.POST({
					name: '获取承诺书模版下载链接',
					url: '/api/auth/getlinkinfo',
					data: {}
				}).then((res) => {
					this.link_url = res.data.data
				});
			},
			getzipinfo() {
				this.GET({
					name: '获取ex模板下载链接',
					url: '/api/auth/getexinfo',
					data: {}
				}).then((res) => {
					this.excel_moban_url = res.data.data
				});
			},
			getsaiQ() {
				this.GET({
					name: '赛区',
					url: '/api/competcategory/regions',
					data: {}
				}).then((res) => {
					this.saiQList = res.data.data
				});
			},
			getsaiX() {
				this.GET({
					name: '赛项',
					url: '/api/auth/getsecondcat?id=' + this.saishiId,
					data: {}
				}).then((res) => {
					this.saiXList = res.data.data
				});
			},
			bind_saiQ(e) {
				this.regionsid = this.saiQList[e.detail.value].id
				this.regionsname = this.saiQList[e.detail.value].name
			},
			bind_zuBie(e) {
				const selected = this.zbList[e.detail.value]
				this.zubie = selected ? selected.name : ''
			},
			bind_saiS(e) {
				this.saishiId = this.competition_lists[e.detail.value].id
				this.saishiName = this.competition_lists[e.detail.value].name
				this.getsaiX()
				this.firstcatid = ''
				this.firstcatname = ''
				this.majorid = ''
				this.major = ''
				this.zubie = ''
				this.zbList = []
			},
			bind_saiX(e) {
				this.firstcatid = this.saiXList[e.detail.value].id
				this.firstcatname = this.saiXList[e.detail.value].name
				this.fujian = this.saiXList[e.detail.value].fujian
				this.purl = ''
				this.purlname = ''
				this.attachmentMode = 'LINK'
				this.majorid = ''
				this.major = ''
				this.getZy()
				this.getGroups()
			},
			bind_scolssaiX(e) {
				console.log(this.saiXList[e.detail.value].id)
				this.firstcatid = this.saiXList[e.detail.value].id
				this.firstcatname = this.saiXList[e.detail.value].name
				this.zip_id = ''
				this.execl_id = ''
				this.zip_name = ''
				this.execl_name = ''
			},
			queren() {
				// 先去除首尾空格，再统一转小写，避免大小写/空格导致判断失效
				const trimUrl = this.purl.trim().toLowerCase();

				if (this.attachmentMode === 'LINK' && this.purl && !trimUrl.startsWith('http://') && !trimUrl.startsWith('https://') && this.myInfo.type == 1) {
					uni.showModal({
						content: '作品链接格式错误，必须以http://或https://开头',
						showCancel: false
					});
					return;
				}


				if (this.myInfo.type == 1 && this.istuandui == 1) {
					const phoneReg = /^1[3-9]\d{9}$/;
					for (let i = 0; i < this.teamMembers.length; i++) {
						let m = this.teamMembers[i];
						if (!m.name) {
							uni.showToast({
								title: `请填写第${i + 1}位成员的姓名`,
								icon: 'none'
							});
							return;
						}
						if (!m.sex) {
							uni.showToast({
								title: `请选择第${i + 1}位成员的性别`,
								icon: 'none'
							});
							return;
						}
						if (!m.idcard || (m.credential_type === '身份证号' && m.idcard.length !== 18)) {
							uni.showToast({
								title: `第${i + 1}位成员证件号格式不正确`,
								icon: 'none'
							});
							return;
						}
						if (!m.school) {
							uni.showToast({title: `请填写第${i + 1}位成员所在学校`, icon: 'none'});
							return;
						}
						if (!m.group) {
							uni.showToast({title: `请选择第${i + 1}位成员的组别`, icon: 'none'});
							return;
						}
					}
				}





				this.showLoadingModal('提交中...')
				if (this.myInfo.type == 1) {
					let signupData = {
						title: this.title,
						competitionid: this.saishiId,
						zubie: this.zubie,
						firstcatid: this.firstcatid,
						secaodcatid: this.majorid,
						teachername: this.teachername,
						description: this.description,
						phone: this.phone,
						userid: this.myInfo.id,
						regionsid: this.regionsid,
						major: this.major,
						majorid: this.majorid,
						purl: this.purl,
						purlname: this.purlname || this.title,
						attachment_type: this.attachmentMode,
						type: this.myInfo.type,
						istuandui: this.istuandui
					};

					if (this.istuandui == 1) {
						signupData.team_members = JSON.stringify(this.teamMembers);
					}
					this.POST({
						name: '个人报名接口',
						url: '/api/competition/signup',
						data: signupData
					}).then((res) => {
						console.log(11111111111111111111111111)
						this.hideLoadingModal();
						uni.showToast({
							title: '报名成功',
							icon: "none"
						})
						setTimeout(() => {
							this.leftName = '参赛记录'
							this.rightName = '参赛记录列表'
						}, 1000)
					}).catch(err => {
						uni.showToast({
							title: '提交失败',
							icon: 'none'
						});
						this.hideLoadingModal();
					});
				}
				if (this.myInfo.type == 2) {
					this.clearPolling();
					this.POST({
						name: '学校报名接口',
						url: '/api/dramacompetition/confirmImportoss',
						data: {
							type: this.myInfo.status,
							competitionid: this.saishiId,
							session_id: this.firstcatid == 1 ? this.zip_id : 3 + 'session_id',
							excel_id: this.execl_id,
							userid: this.myInfo.id,
							zip_name: this.firstcatid == 1 ? this.zip_name : '剧目演出',
							excel_name: this.execl_name
						}
					}).then((res) => {
						this.resetForm();
						this.hideLoadingModal();
						uni.showModal({
							title: '提示',
							content: res.data.message,
							success: (modal) => {
								if (modal.confirm) {
									console.log('用户点击确定');
									this.leftName = '参赛记录'
									this.rightName = '导入记录'
									this.goDrJl(null, res.data.competitionid)
								} else if (modal.cancel) {
									console.log('用户点击取消');
								}
							}
						});
					}).catch(err => {
						uni.showToast({
							title: '提交失败',
							icon: 'none'
						});
						this.hideLoadingModal();
						console.error('confirmImport error:', err);
					});
				}
			},
			getUserInfo() {
				this.POST({
					name: '个人信息2',
					url: '/api/auth/userinfo',
					data: {}
				}).then((res) => {
					if (res.data.code == 401) {
						this.isLogin = false
						uni.reLaunch({
							url: '/pages/login/login'
						});
					} else {
						this.isLogin = true
						this.myInfo = res.data.data
						if (this.myInfo.type == 1) {
							this.stud_name = this.myInfo.name || '';
							this.stud_phone = this.myInfo.phone || '';
							this.stud_sex = this.myInfo.sex || '';
							this.stud_credential_type = this.myInfo.credential_type || '身份证号';
							this.stud_idcard = this.myInfo.idcard || '';
							this.stud_cities = this.myInfo.cities || '';
							this.stud_citieName = this.myInfo.cityname || '';
							this.stud_school = this.myInfo.school || '';
							this.stud_schoolid = this.myInfo.schoolid || '';
							if (this.isZhuce == true) {
								this.goleftName('个人信息')
							} else {
								this.goleftName('作品提交')
							}
						}

						if (this.myInfo.type == 2) {
							this.schoolName = this.myInfo.name || '';
							this.contact = this.myInfo.contact || '';
							this.phone = this.myInfo.phone || '';
							this.stud_cities = this.myInfo.cities || '';
							this.stud_citieName = this.myInfo.cityname || '';
							this.email = this.myInfo.email || '';
							this.schoolid = this.myInfo.schoolid || '';
							this.rejectreason = this.myInfo.rejectreason || '';
							this.businessLicenseUrl = this.myInfo.zhizhao || '';
							this.commitmentLetterUrl = this.myInfo.chengnuoshu || '';
							this.commitmentLetterName = this.myInfo.chengnuoshuname || '';
							this.tupiantype = this.myInfo.tupiantype || 0;
							this.localFileType = this.myInfo.tupiantype || 0;
							if (this.localFileType == 0) {
								this.commitmentImgUrl = this.myInfo.chengnuoshu || '';
							}
							if (this.localFileType == 1) {
								this.commitmentPdfUrl = this.myInfo.chengnuoshu || '';
								this.commitmentPdfName = this.myInfo.chengnuoshuname || '';
							}
							if (this.isZhuce == true) {
								this.goleftName('学校认证')
							} else {
								this.goleftName('作品提交')
							}
						}
						this.getcompetitionlists()
					}
				});
			},
			getproductlists() {
				this.showLoadingModal('加载中...')
				this.GET({
					name: '参赛记录列表页',
					url: '/api/competcategory/productlists',
					data: {}
				}).then((res) => {
					this.hideLoadingModal();
					this.product_lists = res.data.data.data
				}).catch(err => {
					uni.showToast({
						title: '加载失败',
						icon: 'none'
					});
					this.hideLoadingModal();
					console.error('confirmImport error:', err);
				});;
			},
			getSchoolRegistrationDetails() {
				this.showLoadingModal('加载中...')
				let reqData = {};
				if (this.selectedRegCompetitionId) {
					reqData.competitionid = this.selectedRegCompetitionId;
				}
				this.GET({
					name: '报名详情列表',
					url: '/api/competcategory/schoolproductlists',
					data: reqData
				}).then((res) => {
					this.hideLoadingModal();
					this.schoolRegistrationDetails = res.data.data || [];
					// 从返回数据中提取赛事列表供筛选用
					if (!this.selectedRegCompetitionId) {
						this.buildRegCompetitionList(this.schoolRegistrationDetails);
					}
				}).catch(err => {
					this.hideLoadingModal();
					this.schoolRegistrationDetails = [];
					uni.showToast({
						title: '加载失败',
						icon: 'none'
					});
					console.error('schoolRegistrationDetails error:', err);
				});
			},
			buildRegCompetitionList(list) {
				// 从返回数据中提取不重复的赛事列表
				let compMap = {};
				(list || []).forEach(item => {
					// 优先用 competition_id，如果没有则用 competition_name 作为 key
					let compId = item.competition_id || item.competition_name;
					let compName = item.competition_name;
					if (compId && compName) {
						compMap[compId] = compName;
					}
				});
				let options = [{
					name: '全部赛事',
					id: ''
				}];
				for (let id in compMap) {
					options.push({
						name: compMap[id],
						id: id
					});
				}
				this.regCompetitionList = options;
			},
			onRegCompetitionFilter(e) {
				const idx = e.detail.value;
				const selected = this.regCompetitionList[idx];
				this.selectedRegCompetitionId = selected.id;
				this.selectedRegCompetitionName = selected.name;
				this.getSchoolRegistrationDetails();
			},
			clearRegCompetitionFilter() {
				this.selectedRegCompetitionId = '';
				this.selectedRegCompetitionName = '';
				this.getSchoolRegistrationDetails();
			},
			showRegistrationDetail(item) {
				this.regDetailItem = item;
				this.showRegDetailPopup = true;
			},
			getcompetitionlists() {
				this.GET({
					name: '比赛事项列表页',
					url: '/api/competcategory/competitionlists',
					data: {
						type: this.myInfo.type,
						status: this.status,
						name: this.sousuoSsName
					}
				}).then((res) => {
					this.competition_lists = res.data.data;
					if (this.competition_lists.length > 0 && !this.saishiId) {
						const firstItem = this.competition_lists[0];
						this.saishiId = firstItem.id;
						this.saishiName = firstItem.name;
						this.getsaiX()
					} else if (this.competition_lists.length === 0) {
						this.saishiId = '';
						this.saishiName = '';
					}
				});
			},
			bindPickerChange1(e) {
				const selectedIndex = e.detail.value;
				const selectedItem = this.array1[selectedIndex];
				this.saishi_type = selectedItem.name;
				this.status = selectedItem.value;
				this.getcompetitionlists();
			},
			bindPickerChange2: function(e) {
				this.stud_cities = this.saiquList[e.detail.value].id
				this.stud_citieName = this.saiquList[e.detail.value].name
			},
			bindPickerChange3: function(e) {
				this.majorid = this.zyList[e.detail.value].id
				this.major = this.zyList[e.detail.value].name
				this.zubie = ''
				this.getGroups()
			},
			gotoLogin(type) {
				uni.navigateTo({
					url: `/pages/login/login?is_school=${type}`
				});
			},
			goleftName(tabName) {
				if (tabName === '获奖记录') {
					// 个人中心的获奖记录统一进入学生成绩查询，并固定展示学生查询表单/结果。
					uni.setStorageSync('last_cjcx_type', {
						id: 1,
						name: '学生查询'
					});
					uni.switchTab({
						url: '/pages/index/grade'
					});
					return;
				}

				this.leftName = tabName;
				if (this.myInfo.type == 1) {
					if (this.leftName == '个人信息') {
						this.rightName = '个人资料'
					}
					if (this.leftName == '作品提交') {
						this.rightName = '赛事列表'
					}
					if (this.leftName == '参赛记录') {
						this.rightName = '参赛记录列表'
						this.getproductlists();
					}
				}
				if (this.myInfo.type == 2) {
					if (this.leftName == '学校认证') {
						this.rightName = '学校认证信息'
					}
					if (this.leftName == '作品提交' || this.leftName == '参赛记录') {
						this.rightName = '赛事列表'
					}
					if (this.leftName == '报名详情') {
						this.rightName = '报名详情列表'
						this.getSchoolRegistrationDetails();
					}
				}
			},
			onScroll(e) {
				// 实时记录当前 scroll-view 的滚动高度
				this.currentScrollTop = e.detail.scrollTop;
			},
			goCsType(pageName, item) {
				this.savedScrollTop = this.currentScrollTop || 0;
				this.rightName = '参赛记录详情';
				this.getProductDetail(item);
			},
			goHjType(pageName, item) {
				this.savedScrollTop = this.currentScrollTop || 0;
				this.rightName = '获奖记录详情'
				this.hjjlDatas = item
			},
			goNext(item) {
				this.GET({
					name: '有无正在处理的',
					url: '/api/competition/checksignup',
					data: {}
				}).then((res) => {
					if (res.data.data == true) {
						uni.showModal({
							content: '当前有待处理的作品，请勿重复报名提交',
							showCancel: false
						});
					} else {
						this.saishiName = item.name
						this.rightName = '作品上传'
						this.saishiId = item.id
						this.productid = item.productid
					}
				});
			},
			lookHJJilv(item) {
				this.rightName = '获奖记录列表'
				if (this.myInfo.type == 1) {
					this.GET({
						name: '学生获奖记录',
						url: '/api/product/awardrecordlist',
						data: {
							competitionid: item.id
						}
					}).then((res) => {
						this.huojiangjilvList = res.data.data.award_list
					});
				}
				if (this.myInfo.type == 2) {
					this.GET({
						name: '学校获奖记录',
						url: '/api/competcategory/schoolproductlists',
						data: {
							competitionid: item.id
						}
					}).then((res) => {
						this.huojiangjilvList = res.data.data
					});
				}
			},
			viewFile(url) {
				window.open(url, '_blank');
			},
			checkImportProgress() {
				if (!this.job_id) return;

				this.GET({
					name: '导入进度查询',
					url: `/api/dramacompetition/importProgress/${this.job_id}`,
					data: {}
				}).then((res) => {
					uni.showModal({
						content: res.data.data.message,
						showCancel: false
					});
					const progress = res.data?.data?.progress;
					if (typeof progress === 'number' && progress >= 100) {
						this.clearTimer1();
						this.pollTimer2 = setInterval(() => {
							this.checkImportResult();
						}, 2000);
					}
				}).catch(err => {
					this.hideLoadingModal();
					console.error('importProgress error:', err);
					this.clearPolling();
					uni.showToast({
						title: '进度查询失败',
						icon: 'none'
					});
				});
			},
			resetForm() {
				this.title = '';
				this.teachername = '';
				this.description = '';
				this.phone = '';
				this.purl = '';
				this.purlname = '';
				this.attachmentMode = 'LINK';
				this.regionsid = '';
				this.regionsname = '';
				this.firstcatid = '';
				this.firstcatname = '';
				this.major = '';
				this.zip_id = '';
				this.zip_name = '';
				this.execl_id = '';
				this.execl_name = '';
				this.saishiId = '';
				this.saishiName = '';
			},
			goUrl(url) {
				const baseUrl = 'https://admin.cqtxj.org.cn/';
				if (!url) return;
				if (url.startsWith('http://') || url.startsWith('https://')) {
					window.open(url, '_blank');
				} else {
					window.open(baseUrl + url, '_blank');
				}
			},
			getProductDetail(item) {
				if (this.myInfo.type == 1) {
					this.GET({
						name: '参赛记录详情',
						url: '/api/competition/signupdetail',
						data: {
							Competitionid: item.id,
							productid: item.productid
						}
					}).then((res) => {
						if (res.data.code === 200) {
							this.productTeam = res.data.data.team;
							this.productDetail = res.data.data.productinfo;
							this.msgmsgmsg = res.data.data.msg;
							this.active = res.data.data.step - 1;
						} else {
							uni.showToast({
								title: res.data.msg || '加载失败',
								icon: 'none'
							});
						}
					}).catch(err => {
						console.error('加载详情失败', err);
						uni.showToast({
							title: '网络错误',
							icon: 'none'
						});
					});
				}

				if (this.myInfo.type == 2) {
					this.GET({
						name: '导入记录',
						url: '/api/competcategory/schoolproductlists',
						data: {
							competitionid: saishiId,
						}
					}).then((res) => {
						if (res.data.code === 200) {
							this.daoruljList = res.data.data;
							this.productDetail = this.daoruljList.slice(0, 10000);
						} else {
							uni.showToast({
								title: res.data.msg || '加载失败',
								icon: 'none'
							});
						}
					}).catch(err => {
						console.error('加载详情失败', err);
						uni.showToast({
							title: '网络错误',
							icon: 'none'
						});
					});
				}
			},
			gofileType(e) {
				this.localFileType = e; // 只切换类型，不删任何地址
			},
			checkImportResult() {
				if (!this.job_id) return;
				this.GET({
					name: '导入结果查询',
					url: `/api/dramacompetition/importResult/${this.job_id}`,
					data: {}
				}).then((res) => {
					this.clearPolling();
					const message = res.data?.msg || '导入完成';
					uni.showToast({
						title: message,
						icon: 'none'
					});
					this.resetForm();
					this.popup = true
					this.failed_rows = res.data.data.failed_rows
					this.success_rows = res.data.data.success_rows
					this.switchList(this.showSuccessList);
					this.results = res.data.data.results
					this.completed_at = res.data.data.completed_at
					this.zipProgress = 0
					this.excelProgress = 0
					this.leftName = '作品提交'
					this.rightName = '赛事列表'
				}).catch(err => {
					this.hideLoadingModal();
					console.error('importResult error:', err);
					this.clearPolling();
					uni.showToast({
						title: '结果查询失败',
						icon: 'none'
					});
				});
			},
			yichuwenjian(e) {
				if (e == 1) {
					this.zip_id = ''
					this.zip_name = ''
					this.execl_id = ''
					this.execl_name = ''
					this.zipProgress = 0
					this.excelProgress = 0
				}
				if (e == 2) {
					this.execl_id = ''
					this.execl_name = ''
					this.excelProgress = 0
				}
			},
			outLogin() {
				uni.showModal({
					title: '提示',
					content: '确认要退出登录吗？',
					success: (modal) => {
						if (modal.confirm) {
							uni.clearStorageSync();
							uni.reLaunch({
								url: '/pages/login/login'
							})
						}
					}
				});
			},
			clearTimer1() {
				if (this.pollTimer1) {
					clearInterval(this.pollTimer1);
					this.pollTimer1 = null;
				}
			},
			clearTimer2() {
				if (this.pollTimer2) {
					clearInterval(this.pollTimer2);
					this.pollTimer2 = null;
				}
			},
			clearPolling() {
				this.clearTimer1();
				this.clearTimer2();
			},
			noBaoMing() {
				uni.showToast({
					title: '正在审核不能报名',
					icon: "none"
				});
			},
			chooseWj() {
				uni.chooseFile({
					count: 1,
					extension: ['.zip'],
					success: (res) => {
						const file = res.tempFiles[0];
						this.purlname = file.name;
						const timeRandom = this.getTimestampRandom();
						const timename = `user_product/${timeRandom}-${file.name}`;

						this.showLoadingModal('上传中...')

						uploadOss(file, timename).then(ossUrl => {
							this.hideLoadingModal();
							uni.showToast({
								title: '上传成功',
								icon: 'none'
							});
							this.purl = ossUrl;
						}).catch(err => {
							this.hideLoadingModal();
							uni.showToast({
								title: '上传失败',
								icon: 'none'
							});
							console.error('OSS 上传失败', err);
						});
					},
					fail: (err) => {
						console.error('选择文件失败', err);
						uni.showModal({
							content: '选择文件失败，请重新上传，推荐使用Google Chrome浏览器',
							showCancel: false
						});
						this.hideLoadingModal();
					}
				});
			},
			setAttachmentMode(mode) {
				if (this.attachmentMode === mode) return;
				this.attachmentMode = mode;
				this.purl = '';
				this.purlname = '';
			},
			console111() {
				console.log('this.displayList', this.displayList)
			},
			switchList(isSuccess) {
				// 不管是否相同，都强制刷新（修复初始化不显示）
				this.showSuccessList = isSuccess;

				this.currentPage = 1;
				this.hasMore = true;

				// 强制重新赋值
				const source = this.showSuccessList ? this.success_rows : this.failed_rows;
				this.displayList = source.slice(0, this.pageSize);
			},
			loadMore() {
				if (!this.hasMore) return;

				const sourceList = this.showSuccessList ? this.success_rows : this.failed_rows;
				const total = sourceList.length;

				// 计算下一页
				const start = this.currentPage * this.pageSize;
				const end = start + this.pageSize;

				if (start >= total) {
					this.hasMore = false;
					return;
				}

				// 把下一页数据 追加 到 displayList
				const nextData = sourceList.slice(start, end);
				this.displayList = [...this.displayList, ...nextData];

				// 页码+1
				this.currentPage++;
			},
			goDrJl(item, competitionid) {
				console.log('_____item', item)
				console.log('_____competitionid', competitionid)
				this.rightName = '导入记录'
				this.displayedDrjlList = [];
				this.showLoadingModal('加载中...')
				this.POST({
					name: '导入记录',
					url: '/api/competition/getTaskResult',
					data: {
						competitionid: item == null ? competitionid : item.id,
					}
				}).then((res) => {
					this.hideLoadingModal();
					if (res.data.code === 200) {
						if (res.data.data.data.length == 0) {
							uni.showToast({
								title: '暂无数据',
								icon: 'none'
							});
							return
						}
						this.daoruljList = res.data.data.data;
						this.displayedDrjlList = this.daoruljList.slice(0, this.drjlPageSize);
					} else {
						uni.showToast({
							title: res.data.msg || '加载失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					this.hideLoadingModal();
					console.error('加载详情失败', err);
					uni.showToast({
						title: '网络错误',
						icon: 'none'
					});
				});
			},
			loadMoreDrjl() {
				const currentlyDisplayedCount = this.displayedDrjlList.length;
				const totalCount = this.daoruljList.length;
				if (currentlyDisplayedCount >= totalCount) {
					return;
				}
				const nextPageStartIndex = currentlyDisplayedCount;
				const nextPageEndIndex = nextPageStartIndex + this.drjlPageSize;
				const nextPageData = this.daoruljList.slice(nextPageStartIndex, nextPageEndIndex);
				this.displayedDrjlList = [...this.displayedDrjlList, ...nextPageData];
			},
			golookxq1(item, daoruJiLvCompetitionid) {
				this.rightName = '参赛记录详情'
				this.savedScrollTop = this.currentScrollTop || 0;
				this.GET({
					name: '学生---参赛记录详情',
					url: '/api/competition/signupdetail',
					data: {
						Competitionid: item.competitionid || daoruJiLvCompetitionid,
						productid: daoruJiLvCompetitionid ? item.product_id : item.id
					}
				}).then((res) => {
					if (res.data.code === 200) {
						this.productTeam = res.data.data.team;
						this.productDetail = res.data.data.productinfo;
						this.msgmsgmsg = res.data.data.msg;
						this.active = res.data.data.step - 1;
					} else {
						uni.showToast({
							title: res.data.msg || '加载失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					console.error('加载详情失败', err);
					uni.showToast({
						title: '网络错误',
						icon: 'none'
					});
				});
			},
			golookxq2(item) {
				this.rightName = '导入记录详情'
				this.savedScrollTop = this.currentScrollTop || 0;
				this.showLoadingModal('加载中...')
				this.GET({
					name: '学校---参赛记录详情',
					url: '/api/competition/getTaskDetail',
					data: {
						Competitionid: item.competitionid,
						id: item.id
					}
				}).then((res) => {
					this.hideLoadingModal();
					if (res.data.code === 200) {
						this.DiaoD = res.data.data;
						this.daoruJiLvList = res.data.data.results;
						this.daoruJiLvCompetitionid = res.data.data.competitionid;
					} else {
						uni.showToast({
							title: res.data.msg || '加载失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					this.hideLoadingModal();
					console.error('加载详情失败', err);
					uni.showToast({
						title: '网络错误',
						icon: 'none'
					});
				});
			},
			golookxq3(item) {
				this.rightName = '参赛记录详情'
				this.GET({
					name: '学校---参赛记录详情',
					url: '/api/competition/signupdetail',
					data: {
						Competitionid: item.competitionid,
						productid: item.id
					}
				}).then((res) => {
					if (res.data.code === 200) {
						this.productTeam = res.data.data.team;
						this.productDetail = res.data.data.productinfo;
						this.msgmsgmsg = res.data.data.msg;
						this.active = res.data.data.step - 1;
					} else {
						uni.showToast({
							title: res.data.msg || '加载失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					console.error('加载详情失败', err);
					uni.showToast({
						title: '网络错误',
						icon: 'none'
					});
				});
			},
			getTimestampRandom() {
				const timestamp = new Date().getTime();
				const random = Math.floor(Math.random() * 900) + 100;
				return `${timestamp}` + `${random}`;
			},
			codeZIP() {
				uni.chooseFile({
					count: 1,
					extension: ['.zip'],
					success: (res) => {
						this.zip_id = '';
						this.zip_name = '';
						this.execl_id = '';
						this.execl_name = '';

						const file = res.tempFiles[0];
						const fileName = file.name;
						this.startFakeZipProgress();
						this.showLoadingModal('上传中...')

						const timeRandom = this.getTimestampRandom();
						const timename = `user_excel/${timeRandom}` + `${fileName}`;

						uploadOss(file, timename).then(cosRes => {
							console.log('cosRes', cosRes)
							this.hideLoadingModal();
							uni.showToast({
								title: '上传成功',
								icon: 'none'
							});

							this.POST({
								name: '上传zip',
								url: '/api/dramacompetition/uploadAttachmentZiposs',
								data: {
									oss_zip_url: cosRes
								}
							}).then((res) => {
								this.zip_id = res.data.data.session_id;
								this.zip_name = fileName;
								this.zipProgress = 100;
							}).catch(() => {
								this.hideLoadingModal();
								this.zipProgress = 0;
							});
						}).catch(() => {
							this.hideLoadingModal();
							this.zipProgress = 0;
						});
					},
					fail: (err) => {
						console.error('选择文件失败', err);
						this.hideLoadingModal();
						uni.showModal({
							content: '选择文件失败，请重新上传，推荐使用Google Chrome浏览器',
							showCancel: false
						});
						this.zipProgress = 0;
					}
				});
			},
			codeExecl() {
				if (!this.zip_id && this.firstcatid == 1) {
					uni.showToast({
						title: '请先上传作品zip文件',
						icon: 'none'
					});
					return;
				}
				uni.chooseFile({
					count: 1,
					extension: ['.xlsx', '.xls'],
					success: (res) => {
						const file = res.tempFiles[0];
						const fileName = file.name;
						this.startFakeExcelProgress();
						this.showLoadingModal('上传中...')

						const timeRandom = this.getTimestampRandom();
						const timename = `user_excel/${timeRandom}-${fileName}`;

						uploadOss(file, timename).then(cosRes => {
							console.log('cosRes', cosRes)
							this.hideLoadingModal();
							uni.showToast({
								title: '上传成功',
								icon: 'none'
							});

							this.POST({
								name: '上传excel',
								url: '/api/dramacompetition/uploadexceloss',
								data: {
									session_id: this.firstcatid == 1 ? this.zip_id : 3 +
										'session_id',
									oss_excel_url: cosRes
								}
							}).then((res) => {
								this.execl_id = res.data.data.excel_id;
								this.execl_name = fileName;
								this.excelProgress = 100;
							}).catch(() => {
								this.hideLoadingModal();
								this.excelProgress = 0;
							});
						}).catch(() => {
							this.hideLoadingModal();
							this.excelProgress = 0;
						});
					},
					fail: (err) => {
						console.error('选择文件失败', err);
						uni.showModal({
							content: '选择文件失败，请重新上传，推荐使用Google Chrome浏览器',
							showCancel: false
						});
						this.hideLoadingModal();
						this.excelProgress = 0;
					}
				});
			},
			startFakeZipProgress() {
				this.zipProgress = 0
				let timer = setInterval(() => {
					if (this.zipProgress < 95) {
						this.zipProgress += Math.random() * 3
					} else {
						clearInterval(timer)
					}
				}, 100)
			},
			startFakeExcelProgress() {
				this.excelProgress = 0
				let timer = setInterval(() => {
					if (this.excelProgress < 95) {
						this.excelProgress += Math.random() * 3
					} else {
						clearInterval(timer)
					}
				}, 100)
			},
			baocun_info() {
				this.showLoadingModal('提交中...')
				this.POST({
					name: '学生信息修改',
					url: '/api/auth/updateuserinfo',
					data: {
						type: 1,
						name: this.stud_name,
						phone: this.stud_phone,
						sex: this.stud_sex,
						credential_type: this.stud_credential_type,
						idcard: this.stud_idcard,
						cities: this.stud_cities,
						school: this.stud_school,
						schoolid: this.stud_schoolid,
					}
				}).then((res) => {
					this.hideLoadingModal();
					if (res.data.code === 200) {
						uni.showToast({
							title: '操作成功',
							icon: 'success'
						});
						this.getUserInfo();
					} else {
						uni.showToast({
							title: res.data.msg || '提交失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					this.hideLoadingModal();
					console.error('认证提交失败', err);
					uni.showToast({
						title: '提交失败，请重试',
						icon: 'none'
					});
				});
			},
			renzheng_school() {
				this.showLoadingModal('提交中...')
				this.POST({
					name: '学校认证修改',
					url: '/api/auth/updateuserinfo',
					data: {
						type: 2,
						name: this.schoolName,
						contact: this.contact,
						phone: this.phone,
						cities: this.stud_cities,
						email: this.email,
						schoolid: this.schoolid,
						zhizhao: this.businessLicenseUrl,
						chengnuoshu: this.localFileType == 0 ? this.commitmentImgUrl : this.commitmentPdfUrl,
						chengnuoshuname: this.localFileType == 0 ? '' : this.commitmentPdfName,
						tupiantype: this.localFileType
					}
				}).then((res) => {
					this.hideLoadingModal();
					if (res.data.code === 200) {
						uni.showToast({
							title: '操作成功',
							icon: 'success'
						});
						this.getUserInfo();
					} else {
						uni.showToast({
							title: res.data.msg || '提交失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					this.hideLoadingModal();
					console.error('认证提交失败', err);
					uni.showToast({
						title: '提交失败，请重试',
						icon: 'none'
					});
				});
			},

			// 营业执照 OSS 上传
			uploadBusinessLicense() {
				uni.chooseImage({
					count: 1,
					sizeType: ['original', 'compressed'],
					sourceType: ['album', 'camera'],
					success: (res) => {
						const tempFile = res.tempFiles[0];
						const timeRandom = this.getTimestampRandom();
						const timename = `school_license/${timeRandom}-${tempFile.name}`;

						this.showLoadingModal('上传中...')

						uploadOss(tempFile, timename).then(ossUrl => {
							this.hideLoadingModal();
							this.businessLicenseUrl = ossUrl;
							uni.showToast({
								title: '上传成功'
							});
						}).catch(err => {
							this.hideLoadingModal();
							uni.showToast({
								title: '上传失败',
								icon: 'none'
							});
						});
					}
				});
			},

			downloadTemplate(url) {
				if (url) {
					window.open(url, '_blank');
				} else {
					uni.showToast({
						title: '下载链接未配置',
						icon: 'none'
					});
				}
			},

			// 承诺书图片 OSS
			uploadCommitmentImage() {
				uni.chooseImage({
					count: 1,
					success: (res) => {
						const tempFile = res.tempFiles[0];
						const timeRandom = this.getTimestampRandom();
						const timename = `school_commitment/${timeRandom}-${tempFile.name}`;

						this.showLoadingModal('上传中...')

						uploadOss(tempFile, timename).then(ossUrl => {
							this.hideLoadingModal();
							this.commitmentImgUrl = ossUrl;
							this.commitmentLetterName = tempFile.name;
							uni.showToast({
								title: '上传成功'
							});
						}).catch(err => {
							this.hideLoadingModal();
							uni.showToast({
								title: '上传失败',
								icon: 'none'
							});
						});
					}
				});
			},

			// 承诺书 PDF OSS
			uploadCommitmentPdf() {
				uni.chooseFile({
					count: 1,
					extension: ['pdf'],
					success: (res) => {
						const file = res.tempFiles[0];
						const timeRandom = this.getTimestampRandom();
						const timename = `school_commitment/${timeRandom}-${file.name}`;

						this.showLoadingModal('上传中...')

						uploadOss(file, timename).then(ossUrl => {
							this.hideLoadingModal();
							this.commitmentPdfUrl = ossUrl;
							this.commitmentPdfName = file.name;
							uni.showToast({
								title: '上传成功'
							});
						}).catch(err => {
							this.hideLoadingModal();
							uni.showToast({
								title: '上传失败',
								icon: 'none'
							});
						});
					}
				});
			},

			chakyuanyin(text) {
				this.showModal(text);
			}
		}
	};
</script>

<style lang="scss" scoped>
	page {
		background: #F5F5F5;
	}

	/*  电脑端样式 */
	@media (min-width: 769px) {

		/* 成员列表容器 */
		.member-list-container {
			width: 26.56vw;
			padding: 10rpx 0;
		}



		.popup_box {
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.7);
			z-index: 900;

			.boxs {
				background: #FFFFFF;
				border-radius: 10rpx;
				width: 51.04vw;
				z-index: 999;
				overflow: hidden;

				.tops {
					width: 100%;
					height: 2.60vw;
					background: #F5F5F5;
					border-radius: 50rpx 50rpx 0 0;

					text {
						font-size: 0.83vw;
						color: #1F1F1F;
						margin-left: 1.15vw;
					}

					image {
						width: 1.04vw;
						height: 1.04vw;
						margin-right: 1.15vw;
					}
				}

				.textXxs {
					font-size: 0.7vw;
					color: #999;
					margin: 1vw 0 1vw 2vw;
				}

				.xinxiBox {
					margin: 0.5vw 0 0 0;
					padding: 0 1vw;
					box-sizing: border-box;

					.itemL {
						width: 1rpx;
						height: 50rpx;
						background-color: #d4d4d4;
					}

					.itemNum {
						width: 8vw;

						.textN1 {
							font-size: 0.9vw;
						}

						.textN2 {
							font-size: 0.7vw;
							color: #999;
						}
					}
				}

				.xinxilists {
					padding: 1.15vw 1.04vw 2.86vw 1.04vw;
					box-sizing: border-box;

					.isTop {
						background: #E62402;
						color: #FFFFFF;
					}

					.isBottom1 {
						background: #ffffff;
						color: #1F1F1F;
					}

					.isBottom2 {
						background: #F5F5F5;
						color: #1F1F1F;
					}

					.popupToolBox {
						width: 100%;
						border-radius: 21rpx;
						padding: 0.73vw 1.51vw 0.73vw 1.51vw;
						box-sizing: border-box;
						font-weight: 500;
						font-size: 0.73vw;

						.TFimg {
							width: 1vw;
							height: 1vw;
							margin-right: 0.5vw;
							flex-shrink: 0;
						}
					}

					.popup_listBox {
						width: 49.04vw;
						height: 18.23vw;
					}
				}
			}
		}

		.weidlImg {
			width: 5vw;
			height: 5vw;
			margin-top: 17vw;
			margin-bottom: 2vw;
		}

		.weidlText {
			font-size: 1vw;
			color: 3333;
			margin-bottom: 12vw;
		}

		.pageBox {
			width: 100vw;

			.myBox {
				width: 62.5vw;
				max-width: 3400rpx;
				padding-top: 7.2vw;

				.box1 {
					width: 100%;
					background: #FFFFFF;
					border-radius: 40rpx;
					padding: 1vw 1.61vw 1vw 1vw;
					box-sizing: border-box;
					margin-bottom: 1vw;

					.tx-img {
						width: 3.13vw;
						height: 3.13vw;
						margin-right: 0.52vw;
						border-radius: 50%;
					}

					.text1 {
						font-weight: 500;
						font-size: 0.83vw;
						color: #1F1F1F;
						margin-bottom: 0.26vw;
					}

					.text2 {
						padding: 0.1vw 0.42vw;
						box-sizing: border-box;
						background: #F5F5F5;
						font-weight: 500;
						font-size: 0.63vw;
						color: #999999;
						border-radius: 10rpx;
						display: inline-flex;
					}

					.text3 {
						font-weight: 500;
						font-size: 0.7vw;
						color: #333;
						margin-left: 0.3vw;
					}

					.text4 {
						width: 1vw;
						height: 1vw;
						margin-left: 0.2vw;
					}

					.button {
						width: 5.05vw;
						height: 2.08vw;
						background: #F5F5F5;
						border-radius: 14rpx;

						image {
							width: 1vw;
							height: 1vw;
							margin-right: 0.16vw;
						}

						text {
							font-weight: 500;
							font-size: 0.73vw;
							color: #1F1F1F;
						}
					}
				}

				.box2 {
					width: 10.42vw;
					height: 23.23vw;
					background: #FFFFFF;
					border-radius: 40rpx;
					margin-bottom: 1.51vw;
					overflow: hidden;

					.tabT {
						cursor: pointer;
						width: 100%;
						height: 3.13vw;
						background-color: #E62402;
						font-weight: 500;
						font-size: 0.94vw;
						color: #FFFFFF;
						text-align: center;
						line-height: 3.13vw;
					}

					.tabF {
						cursor: pointer;
						width: 100%;
						height: 3.13vw;
						background-color: none;
						font-weight: 500;
						font-size: 0.94vw;
						color: #1F1F1F;
						text-align: center;
						line-height: 3.13vw;
					}

				}

				.rightTopTitle {
					margin-bottom: 0.8vw;

					.image {
						width: 1vw;
						height: 1vw;
						margin-right: 0.3vw;
					}

					.text {
						font-size: 1vw;
						color: #999;
						line-height: 1vw;
					}
				}

				.box4 {
					margin-bottom: 1.51vw;

					.codeBox {
						width: 51.04vw;
						padding: 1.67vw 2.09vw 2.45vw 5.97vw;
						box-sizing: border-box;
						background: #FFFFFF;
						border-radius: 40rpx;

						.inputs_all {
							display: flex;
							flex-direction: column;
							gap: 1.04vw;
							margin-bottom: 2.34vw;

							.Xiaotitle {
								font-size: 0.83vw;
								font-weight: 400;
								color: #333;
								margin-bottom: 0.1vw;
							}

							.shnagcImg {
								width: 8vw;
								height: 8vw;
							}

							.shenhTub {
								width: 8vw;
								height: 8vw;
							}

							.buttons {
								padding: 0.2vw 0.3vw;
								box-sizing: border-box;
								background: #ff0000;
								border-radius: 14rpx;
								font-size: 1vw;
							}

							.marginBottom {
								margin-bottom: 5.4vw;
							}

							.add_img {
								width: 8.33vw;
								height: 8.33vw;
								margin-right: 1.82vw;
							}
						}

						.buttonBox {
							margin-left: 5vw;
							margin-top: 1.46vw;
							gap: 1.88vw;

							.button0 {
								width: 20.16vw;
								height: 3.02vw;
								background: #E62402;
								border-radius: 14rpx;
								font-weight: 500;
								font-size: 1.04vw;
								color: #FFFFFF;
								text-align: center;
								line-height: 3.02vw;
							}

							.button1 {
								width: 10.16vw;
								height: 3.02vw;
								background: #E62402;
								border-radius: 14rpx;
								font-weight: 500;
								font-size: 1.04vw;
								color: #FFFFFF;
								text-align: center;
								line-height: 3.02vw;
							}

							.button2 {
								width: 10.16vw;
								height: 3.02vw;
								background: #F5F5F5;
								border-radius: 14rpx;
								font-weight: 500;
								font-size: 1.04vw;
								color: #1F1F1F;
								text-align: center;
								line-height: 3.02vw;
							}
						}

						.saishiText {
							width: 100%;
							font-size: 0.83vw;
							color: #333;
							font-weight: 900;
							margin-bottom: 1vw;
							text-align: center;
						}

						.choose1 {
							width: 5vw;
							height: 2vw;
							background-color: #E62402;
							color: #ffffff;
							font-size: 1vw;
							line-height: 2vw;
							text-align: center;
							margin-bottom: 1vw;
						}

						.choose0 {
							width: 5vw;
							height: 2vw;
							background-color: #d3d3d3;
							color: #333;
							font-size: 1vw;
							line-height: 2vw;
							text-align: center;
							margin-bottom: 1vw;
						}

						.leftText {
							width: 8vw;
							font-weight: 500;
							font-size: 0.83vw;
							color: #E62402;
							text-align: right;
							margin-right: 1.67vw;
						}

						.leftText2 {
							font-size: 0.83vw;
							color: #333333;
						}

						.mobanText {
							margin-left: 1vw;
							color: #999;
							font-size: 0.83vw;
							text-decoration: underline;
						}

						.sexBox {
							margin: 0.78vw 0;

							.icon {
								width: 1vw;
								height: 1vw;
								margin-right: 0.36vw;
							}

							.text {
								font-size: 0.83vw;
								color: #1F1F1F;
								margin-right: 1.41vw;
							}
						}

						.codeText {
							width: 6.46vw;
							height: 2.60vw;
							background: #FAFAFA;
							border-radius: 10rpx;
							font-weight: 500;
							font-size: 0.83vw;
							color: #999999;
							text-align: center;
							line-height: 2.60vw;
						}

						.codeInfoBox {
							margin-top: 0.3vw;
							margin-left: 2vw;

							.text1 {
								font-weight: 500;
								font-size: 0.73vw;
								color: #1F1F1F;
							}

							.text2 {
								font-weight: 500;
								font-size: 0.73vw;
								color: #E62402;
							}

							.text3 {
								font-weight: 500;
								font-size: 0.73vw;
								color: #E62402;
								text-decoration: underline;
								margin-left: 0.3vw;
							}

							.truefalseBox {
								gap: 0.63vw;
								display: flex;
								flex-direction: column;
								margin-top: 1vw;

								image {
									width: 1vw;
									height: 1vw;
									margin-right: 0.52vw;
								}
							}
						}

						.jdtBox {
							position: relative;
							width: 16vw;
							height: 1.04vw;
							background: #F5F5F5;
							border-radius: 26rpx;
							// overflow: hidden;

							.is_jdt {
								position: absolute;
								top: 0;
								left: 0;
								height: 100%;
								background: linear-gradient(90deg, #8D0B0B 0%, #E62402 100%);
								border-radius: 26rpx;
							}
						}

						.icons {
							width: 1vw;
							height: 1vw;
							margin-left: 1vw;
							margin-right: 0.5vw;
						}

						.xz-text {
							font-size: 0.83vw;
							color: #1F1F1F;
						}

						.long_box {
							width: 21.56vw;
							height: 2.60vw;
							background: #F5F5F5;
							border-radius: 10rpx;
							padding: 0 0.52vw;
							box-sizing: border-box;
							border: 1rpx solid #999;

							.input {
								width: 20vw;
								font-weight: 500;
								font-size: 0.83vw;
								color: #333;
							}

							.icon {
								width: 0.83vw;
								height: 0.83vw;
							}
						}

						.long_box2 {
							width: 21.56vw;
							padding: 0.4vw;
							box-sizing: border-box;
							background: #F5F5F5;
							border-radius: 10rpx;
							box-sizing: border-box;
							font-weight: 500;
							font-size: 0.83vw;
							color: #333;
							border: 1rpx solid #999;
						}
					}


					.wuxianBox {
						width: 51.04vw;
						padding: 1.67vw 2.09vw 2.45vw 2.97vw;
						box-sizing: border-box;
						background: #FFFFFF;
						border-radius: 40rpx;

						.sxjjjjj {
							gap: 1vw;
							display: flex;
							flex-direction: column;
						}

						.top {
							font-size: 0.94vw;
							color: #000;
							margin: 2vw 0;
						}

						.zuo {
							width: 6vw;
							font-size: 0.94vw;
							color: #000;
							margin-right: 1vw;
							line-height: 1.4vw;
						}

						.you {
							width: 40vw;
							font-size: 0.94vw;
							font-weight: 400;
							color: #333;
							line-height: 1.4vw;
						}

						.img {
							width: 12vw;
							height: 12vw;
							border-radius: 10rpx;
						}
					}

					.boxBottom {
						width: 51.04vw;
						padding: 1vw 0;
						box-sizing: border-box;
						background: #FFFFFF;
						border-radius: 40rpx;

						.hjImg {
							height: 15.63vw;
							margin-right: 2.14vw;
						}

						.xz-button {
							width: 6vw;
							height: 2vw;
							background: #f00;
							border-radius: 0.3vw;
							font-size: 1vw;
							color: #FFFFFF;
							line-height: 2vw;
							text-align: center;
							margin-top: 0.2vw;
						}

						.text1 {
							font-weight: bold;
							font-size: 1.24vw;
							color: #1F1F1F;
						}

						.hj-title-box {
							width: 70%;
							margin-top: 2vw;

							.title {
								font-weight: 500;
								font-size: 1.04vw;
								color: #1F1F1F;
								margin-bottom: 1.08vw;
							}

							.text {
								font-weight: 500;
								font-size: 0.73vw;
								color: #1F1F1F;
								text-align: left;
								margin-bottom: 1.04vw;
							}
						}

						image {
							width: 12.24vw;
							height: 12.24vw;
							margin-left: 2.97vw;
							margin-right: 2.92vw;
						}

						.textBox {
							gap: 1vw;
							display: flex;
							flex-direction: column;

							text {
								font-weight: 500;
								font-size: 0.83vw;
								color: #1F1F1F;
							}
						}

					}
				}

				.box3 {
					width: 51.04vw;
					height: 23.23vw;
					background: #FFFFFF;
					border-radius: 40rpx;
					margin-bottom: 1.51vw;

					.tiaoshuText {
						width: 100%;
						text-align: left;
						font-size: 0.9vw;
						color: #333;
						margin-left: 3vw;
						margin-bottom: 0.2vw;
					}

					.xszt {
						width: 100%;
						text-align: left;
						font-size: 1vw;
						color: #333;
						margin-left: 3vw;
						margin-bottom: 1vw;
					}

					.topshaiXuanBox {
						width: 49.04vw;
						margin-top: 0.6vw;
						margin-bottom: 0.6vw;

						.sc-button {
							width: 8.33vw;
							height: 2.29vw;
							background: rgba(230, 36, 2, 0.1);
							border-radius: 14rpx;

							image {
								width: 1vw;
								height: 1vw;
								margin-right: 0.52vw;
							}

							text {
								font-weight: 500;
								font-size: 0.83vw;
								color: #E62402;
							}
						}

						.boxinput_Box {
							width: 14.69vw;
							height: 2.29vw;
							background: #F5F5F5;
							border-radius: 20rpx;
							margin-right: 0.78vw;

							.nbu {
								width: 12vw;
								height: 1vw;

								image {
									width: 1vw;
									height: 1vw;
								}

								input {
									width: 7vw;
									font-weight: 500;
									font-size: 0.73vw;
									color: #333333;
									margin-left: 0.42vw;
								}

								.choose_true {
									font-size: 0.73vw;
									color: #333333;
								}

								.choose_false {
									font-size: 0.73vw;
									color: #999999;
								}
							}
						}
					}

					.isTop {
						background: #E62402;
						color: #FFFFFF;
					}

					.isBottom {
						background: #F5F5F5;
						color: #1F1F1F;
					}

					.isBottom:hover {
						background: #ffeded;
						color: #E62402;
					}

					.topToolBox {
						width: 49.04vw;
						border-radius: 21rpx;
						padding: 0.73vw 1.51vw 0.73vw 1.51vw;
						box-sizing: border-box;
						font-weight: 500;
						font-size: 0.83vw;
						margin-bottom: 0.52vw;
					}

					.listBox1 {
						width: 49.04vw;
						height: 18.23vw;

						.itemBox {
							width: 100%;
							border-radius: 20rpx;
							background: #FAFAFA;
							margin-bottom: 1vw;
							padding: 1.51vw 2.29vw 1.51vw 1.51vw;
							box-sizing: border-box;

							.itemxqBox {
								width: 26vw;
							}

							.title {
								width: 14vw;
								font-weight: 500;
								font-size: 0.83vw;
								color: #1F1F1F;
								text-align: left;
							}

							.text {
								font-weight: 500;
								font-size: 0.83vw;
								color: #1F1F1F;
								margin-right: 0.36vw;
							}

							.ckBox {
								width: 2.50vw;
								height: 1.04vw;
								line-height: 1.04vw;
								background: #EEEEEE;
								border-radius: 10rpx;
								font-size: 0.63vw;
								color: #1F1F1F;
								text-align: center;
							}

							.ckBox:hover {
								width: 2.50vw;
								height: 1.04vw;
								line-height: 1.04vw;
								background: #E62402;
								border-radius: 10rpx;
								font-size: 0.63vw;
								color: #ffffff;
								text-align: center;
							}
						}
					}

					.listBox2 {
						width: 49.04vw;
						height: 18.23vw;
					}

					.listBox3 {
						width: 49.04vw;
						height: 18.23vw;
					}

					.listBox4 {
						width: 49.04vw;
						height: 17.23vw;
					}
				}
			}
		}


		.member-list-container {
			width: 100%;
			/* 在PC弹窗或宽容器中占满可用宽度 */
			max-width: 800px;
			/* 限制最大宽度，避免过宽难看 */
			margin: 0 auto;
		}

		.member-item {
			padding: 40rpx;
		}

		.member-input {
			height: 70rpx;
			font-size: 26rpx;
		}

		.input-label {
			width: 100rpx;
			text-align: right;
			font-size: 22rpx;
		}
	}

	/*  手机端样式 */
	@media (max-width: 768px) {
		.member-list-container {
			width: 100%;
			padding: 10rpx 0;
		}

		.popup_box {
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.7);
			z-index: 900;

			.boxs {
				background: #FFFFFF;
				border-radius: 10rpx;
				width: 700rpx;
				z-index: 999;
				overflow: hidden;

				.tops {
					width: 100%;
					height: 80rpx;
					background: #F5F5F5;
					border-radius: 10rpx 10rpx 0 0;

					text {
						font-size: 28rpx;
						color: #1F1F1F;
						margin-left: 20rpx;
					}

					image {
						width: 40rpx;
						height: 40rpx;
						margin-right: 20rpx;
					}
				}

				.textXxs {
					font-size: 24rpx;
					color: #999;
					margin: 10rpx 0 10rpx 20rpx;
				}

				.xinxiBox {
					margin: 10rpx 0 0 0;
					padding: 0 10rpx;
					box-sizing: border-box;

					.itemL {
						width: 1rpx;
						height: 50rpx;
						background-color: #d4d4d4;
					}

					.itemNum {
						width: 140rpx;
						margin: 20rpx 0;

						.textN1 {
							font-size: 24rpx;
						}

						.textN2 {
							font-size: 24rpx;
							color: #999;
						}
					}
				}

				.xinxilists {
					padding: 24rpx;
					box-sizing: border-box;

					.isTop {
						background: #E62402;
						color: #FFFFFF;
					}

					.isBottom1 {
						background: #ffffff;
						color: #1F1F1F;
					}

					.isBottom2 {
						background: #F5F5F5;
						color: #1F1F1F;
					}

					.popupToolBox {
						width: 100%;
						border-radius: 10rpx;
						padding: 24rpx;
						box-sizing: border-box;
						font-weight: 500;
						font-size: 22rpx;

						.TFimg {
							width: 40rpx;
							height: 40rpx;
							margin-right: 4rpx;
							flex-shrink: 0;
						}
					}

					.popup_listBox {
						width: 100%;
						height: 900rpx;
					}
				}
			}
		}

		.weidlImg {
			width: 100rpx;
			height: 100rpx;
			margin-top: 400rpx;
			margin-bottom: 20rpx;
		}

		.weidlText {
			font-size: 30rpx;
			color: 3333;
			margin-bottom: 400rpx;
		}

		.pageBox {
			width: 100vw;
			padding-bottom: 400rpx;


			.myBox {
				width: 700rpx;
				padding-top: 150rpx;

				.box1 {
					width: 100%;
					background: #FFFFFF;
					border-radius: 10rpx;
					padding: 24rpx;
					box-sizing: border-box;
					margin-bottom: 20rpx;

					.view_d4g5 {
						width: 180rpx;
						height: 60rpx;
						cursor: pointer;

						image {
							width: 32rpx;
							height: 32rpx;
							margin-right: 4rpx;
						}

						text {
							font-size: 24rpx;
							color: #fff;
						}
					}

					.tx-img {
						width: 100rpx;
						height: 100rpx;
						margin-right: 20rpx;
						border-radius: 50%;
					}

					.text1 {
						font-weight: 500;
						font-size: 30rpx;
						color: #1F1F1F;
						margin-bottom: 10rpx;
					}

					.text2 {
						font-weight: 500;
						font-size: 24rpx;
						color: #999999;
					}

					.text3 {
						font-weight: 500;
						font-size: 30rpx;
						color: #333;
						margin-left: 10rpx;
					}

					.text4 {
						width: 30rpx;
						height: 30rpx;
						margin-left: 10rpx;
					}

					.button {
						width: 160rpx;
						height: 72rpx;
						background: #F5F5F5;
						border-radius: 10rpx;

						image {
							width: 32rpx;
							height: 32rpx;
							margin-right: 4rpx;
						}

						text {
							font-weight: 500;
							font-size: 26rpx;
							color: #1F1F1F;
						}
					}
				}

				.box2 {
					width: 160rpx;
					height: 1000rpx;
					background: #FFFFFF;
					border-radius: 10rpx;
					margin-bottom: 20rpx;
					overflow: hidden;

					.tabT {
						cursor: pointer;
						width: 100%;
						height: 70rpx;
						background-color: #E62402;
						font-weight: 500;
						font-size: 30rpx;
						color: #FFFFFF;
						text-align: center;
						line-height: 70rpx;
					}

					.tabF {
						cursor: pointer;
						width: 100%;
						height: 70rpx;
						background-color: none;
						font-weight: 500;
						font-size: 28rpx;
						color: #1F1F1F;
						text-align: center;
						line-height: 70rpx;
					}
				}

				.phoneTopBox {
					padding: 24rpx;
					box-sizing: border-box;
					background-color: #ffffff;
					border-radius: 20rpx;

					.text_true {
						font-weight: bold;
						font-size: 32rpx;
						color: #E62402;
						margin-bottom: 2rpx;
					}

					.text_false {
						font-size: 28rpx;
						color: #999;
						margin-bottom: 2rpx;
					}

					.line_true {
						width: 40rpx;
						height: 6rpx;
						background: #E62402;
					}

					.line_false {
						width: 40rpx;
						height: 6rpx;
						background: none;
					}
				}

				.rightTopTitle {
					margin-bottom: 20rpx;

					.image {
						width: 40rpx;
						height: 40rpx;
						margin-right: 10rpx;
					}

					.text {
						font-size: 28rpx;
						line-height: 40rpx;
						color: #999;
					}
				}

				.box4 {
					// height: 1000rpx;
					margin-bottom: 20rpx;



					.codeBox {
						width: 700rpx;
						padding: 24rpx;
						box-sizing: border-box;
						background: #FFFFFF;
						border-radius: 10rpx;

						.inputs_all {
							display: flex;
							flex-direction: column;
							gap: 24rpx;
							margin-bottom: 24rpx;

							.Xiaotitle {
								font-size: 28rpx;
								font-weight: 400;
								color: #333;
								margin-bottom: 10rpx;
							}

							.shnagcImg {
								width: 180rpx;
								height: 180rpx;
							}

							.shenhTub {
								width: 200rpx;
								height: 200rpx;
							}

							.marginBottom {
								margin-bottom: 30rpx;
							}

							.add_img {
								width: 200rpx;
								height: 200rpx;
								margin-right: 20rpx;
							}
						}

						.buttonBox {
							margin-left: 20rpx;
							margin-top: 24rpx;
							gap: 24rpx;

							.button0 {
								width: 100%;
								height: 70rpx;
								background: #E62402;
								border-radius: 14rpx;
								font-weight: 500;
								font-size: 28rpx;
								color: #FFFFFF;
								text-align: center;
								line-height: 70rpx;
							}

							.button1 {
								width: 290rpx;
								height: 70rpx;
								background: #E62402;
								border-radius: 14rpx;
								font-weight: 500;
								font-size: 28rpx;
								color: #FFFFFF;
								text-align: center;
								line-height: 70rpx;
							}

							.button2 {
								width: 290rpx;
								height: 70rpx;
								background: #F5F5F5;
								border-radius: 14rpx;
								font-weight: 500;
								font-size: 28rpx;
								color: #1F1F1F;
								text-align: center;
								line-height: 70rpx;
							}
						}

						.saishiText {
							width: 100%;
							font-size: 34rpx;
							color: #333;
							font-weight: 900;
							margin-bottom: 20rpx;
							text-align: center;
						}

						.choose1 {
							width: 200rpx;
							height: 80rpx;
							background-color: #E62402;
							color: #ffffff;
							font-size: 30rpx;
							line-height: 80rpx;
							text-align: center;
						}

						.choose0 {
							width: 200rpx;
							height: 80rpx;
							background-color: #999;
							color: #333;
							font-size: 30rpx;
							line-height: 80rpx;
							text-align: center;
						}

						.leftText {
							width: 250rpx;
							font-weight: 500;
							font-size: 24rpx;
							color: #E62402;
							margin-right: 20rpx;
						}

						.leftText2 {
							font-size: 24rpx;
							color: #333333;
						}

						.mobanText {
							margin-left: 20rpx;
							color: #999;
							font-size: 24rpx;
							text-decoration: underline;
						}

						.sexBox {
							margin: 10rpx 0;

							.icon {
								width: 40rpx;
								height: 40rpx;
								margin-right: 2rpx;
							}

							.text {
								font-size: 24rpx;
								color: #1F1F1F;
								margin-right: 12rpx;
							}
						}

						.codeText {
							width: 140rpx;
							height: 70rpx;
							background: #f1f1f1;
							border-radius: 10rpx;
							font-weight: 500;
							font-size: 24rpx;
							color: #999999;
							text-align: center;
							line-height: 70rpx;
						}

						.jdtBox {
							position: relative;
							width: 400rpx;
							height: 20rpx;
							background: #F5F5F5;
							border-radius: 26rpx;
							overflow: hidden;

							.is_jdt {
								position: absolute;
								top: 0;
								left: 0;
								height: 100%;
								background: linear-gradient(90deg, #8D0B0B 0%, #E62402 100%);
								border-radius: 26rpx;
							}
						}

						.codeInfoBox {
							width: 100%;

							.text1 {
								font-weight: 500;
								font-size: 28rpx;
								color: #9d9d9d;
							}

							.text2 {
								font-weight: 500;
								font-size: 28rpx;
								color: #E62402;
							}

							.text3 {
								font-weight: 500;
								font-size: 28rpx;
								color: #E62402;
								text-decoration: underline;
								margin-left: 10rpx;
							}

							.truefalseBox {
								gap: 2rpx;
								display: flex;
								flex-direction: column;
								margin-top: 2rpx;

								image {
									width: 30rpx;
									height: 30rpx;
									margin-right: 10rpx;
								}
							}
						}

						.icons {
							width: 30rpx;
							height: 30rpx;
							margin-left: 20rpx;
							margin-right: 4rpx;
						}

						.xz-text {
							font-size: 24rpx;
							color: #1F1F1F;
						}

						.long_box {
							width: 420rpx;
							height: 80rpx;
							background: #F5F5F5;
							border-radius: 10rpx;
							padding: 0 10rpx;
							box-sizing: border-box;
							border: 1rpx solid #999;

							.input {
								width: 390rpx;
								font-weight: 500;
								font-size: 28rpx;
								color: #333;
							}

							.icon {
								width: 34rpx;
								height: 34rpx;
							}

						}

						.long_box2 {
							border: 1rpx solid #999;
							width: 420rpx;
							padding: 14rpx;
							box-sizing: border-box;
							background: #F5F5F5;
							border-radius: 10rpx;
							box-sizing: border-box;
							font-weight: 500;
							font-size: 28rpx;
							color: #333;
						}
					}


					.wuxianBox {
						width: 700rpx;
						padding: 24rpx;
						box-sizing: border-box;
						background: #FFFFFF;
						border-radius: 20rpx;
						margin-bottom: 100rpx;

						.sxjjjjj {
							width: 100%;
							gap: 14rpx;
							display: flex;
							flex-direction: column;
						}

						.top {
							font-size: 28rpx;
							color: #000;
							margin: 20rpx 0;
						}

						.zuo {
							width: 200rpx;
							font-size: 28rpx;
							font-weight: 900;
							color: #000;
							margin-right: 10rpx;
						}

						.you {
							width: 440rpx;
							font-size: 28rpx;
							font-weight: 400;
							color: #333;
							overflow-wrap: break-word;
							word-break: break-word;
							white-space: normal;
							word-spacing: normal;
						}

						.you2 {
							width: 100%;
							font-size: 28rpx;
							font-weight: 400;
							color: #333;
						}

						.img {
							width: 100rpx;
							height: 100rpx;
							border-radius: 10rpx;
						}
					}

					.boxBottom {
						width: 700rpx;
						padding: 24rpx 0;
						box-sizing: border-box;
						background: #FFFFFF;
						border-radius: 10rpx;

						.hjImg {
							height: 300rpx;
							max-height: 300rpx;
							margin-top: 30rpx;
						}

						.xz-button {
							width: 140rpx;
							height: 66rpx;
							background: #f00;
							border-radius: 20rpx;
							font-size: 28rpx;
							color: #FFFFFF;
							line-height: 66rpx;
							text-align: center;
							margin-top: 10rpx;
						}

						.text1 {
							font-weight: bold;
							font-size: 32rpx;
							color: #1F1F1F;
						}

						.hj-title-box {
							width: 100%;
							text-align: center;
							margin-top: 20rpx;

							.title {
								font-weight: 500;
								font-size: 32rpx;
								color: #1F1F1F;
								margin-bottom: 20rpx;
								margin-top: 20rpx;
							}

							.text {
								font-weight: 500;
								font-size: 28rpx;
								color: #1F1F1F;
								margin-bottom: 20rpx;
							}
						}

						image {
							width: 200rpx;
							height: 200rpx;
							margin-top: 30rpx;
							margin-bottom: 40rpx;
						}

						.textBox {
							width: 400rpx;
							gap: 20rpx;
							display: flex;
							flex-direction: column;

							text {
								font-weight: 500;
								font-size: 28rpx;
								color: #1F1F1F;
							}
						}

					}
				}

				.box3 {
					width: 700rpx;
					background: #FFFFFF;
					border-radius: 10rpx;
					margin-bottom: 20rpx;

					.tiaoshuText {
						width: 100%;
						text-align: left;
						font-size: 28rpx;
						color: #333;
						margin-left: 20rpx;
						margin-bottom: 20rpx;
					}

					.xszt {
						width: 100%;
						text-align: left;
						font-size: 28rpx;
						color: #333;
						margin-left: 20rpx;
					}

					.topshaiXuanBox {
						width: 660rpx;
						box-sizing: border-box;
						margin: 20rpx 0;

						.sc-button {
							width: 150rpx;
							height: 62rpx;
							background: rgba(230, 36, 2, 0.1);
							border-radius: 10rpx;

							image {
								width: 32rpx;
								height: 32rpx;
								margin-right: 3rpx;
							}

							text {
								font-weight: 500;
								font-size: 22rpx;
								color: #E62402;
							}
						}

						.boxinput_Box {
							width: 240rpx;
							height: 60rpx;
							background: #F5F5F5;
							border-radius: 10rpx;
							margin-right: 10rpx;

							.nbu {
								width: 220rpx;
								height: 40rpx;

								image {
									width: 30rpx;
									height: 30rpx;
								}

								input {
									width: 140rpx;
									font-weight: 500;
									font-size: 28rpx;
									color: #333333;
									margin-left: 10rpx;
								}

								.choose_true {
									font-size: 28rpx;
									color: #333333;
								}

								.choose_false {
									font-size: 28rpx;
									color: #999999;
								}
							}
						}
					}

					.isTop {
						background: #E62402;
						color: #FFFFFF;
					}

					.isBottom {
						background: #ffffff;
						color: #1F1F1F;
					}

					.topToolBox {
						width: 700rpx;
						border-radius: 10rpx;
						padding: 24rpx;
						box-sizing: border-box;
						font-weight: 500;
						font-size: 24rpx;

						.xhx {
							width: 100%;
							text-decoration: underline;
							color: #E62402;
							text-align: center;
						}
					}

					.listBox1 {
						width: 700rpx;
						height: 1000rpx;
						padding: 24rpx;
						box-sizing: border-box;

						.itemBox {
							width: 100%;
							border-radius: 20rpx;
							background: #FAFAFA;
							margin-bottom: 20rpx;
							padding: 24rpx;
							box-sizing: border-box;

							.title {
								font-weight: 500;
								font-size: 28rpx;
								color: #1F1F1F;
								text-align: left;
							}

							.text {
								font-weight: 500;
								font-size: 24rpx;
								color: #E62402;
								margin-right: 10rpx;
								text-decoration: underline;
							}

							.ckBox {
								display: none;
							}
						}
					}

					.listBox2 {
						width: 700rpx;
						height: 900rpx;
					}

					.listBox3 {
						width: 700rpx;
						height: 900rpx;
					}

					.listBox4 {
						width: 700rpx;
						height: 900rpx;
					}
				}
			}
		}

		.member-item {
			padding: 24rpx;
			margin-bottom: 20rpx;
		}

		.member-input {
			height: 70rpx;
			font-size: 28rpx;
		}

		.add-member-btn {
			height: 80rpx;
			font-size: 26rpx;
		}
	}








	/* 单个成员项 */
	.member-item {
		display: flex;
		align-items: center;
		background-color: #f8f9fa;
		border-radius: 12rpx;
		padding: 20rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
		position: relative;
	}

	/* 成员序号 */
	.member-index {
		font-size: 24rpx;
		color: #E62402;
		/* 主题红 */
		font-weight: bold;
		flex-shrink: 0;
		text-align: center;
	}

	/* 输入框包裹层 */
	.member-inputs {
		flex: 1;
		display: flex;
		justify-content: space-between;
		gap: 15rpx;
		/* 减小间距以适应三个输入框 */
	}

	/* 具体输入框样式 */
	.member-input {
		flex: 1;
		/* 三个输入框均分剩余空间 */
		height: 70rpx;
		background-color: #ffffff;
		border: 1rpx solid #eeeeee;
		border-radius: 8rpx;
		padding: 0 15rpx;
		font-size: 26rpx;
		/* 稍微缩小字体以防拥挤 */
		color: #333333;
		/* 文字居中更整齐 */
	}

	/* 删除按钮 */
	.delete-btn {
		flex-shrink: 0;
		color: #ff4d4f;
		font-size: 24rpx;
		padding: 10rpx 20rpx;
		background-color: #fff1f0;
		border-radius: 6rpx;
		display: flex;
		align-items: center;
		cursor: pointer;
	}

	.delete-btn .iconfont {
		font-weight: bold;
		margin-right: 4rpx;
		font-size: 28rpx;
	}

	.add-member-btn:active {
		background-color: #fff1f0;
	}

	.plus-icon {
		font-size: 32rpx;
		margin-right: 8rpx;
		font-weight: bold;
	}


	.team-table {
		width: 100%;
		border: 1rpx solid #eee;
		border-radius: 8rpx;
		overflow: hidden;

		.table-header {
			width: 100%;
			display: flex;
			background-color: #f5f5f5;
			font-weight: bold;
			font-size: 26rpx;
			color: #333;

			.th {
				text-align: center;
				padding: 20rpx 0;
				border-right: 1rpx solid #eee;

				&:last-child {
					border-right: none;
				}
			}
		}

		.table-row {
			display: flex;
			font-size: 24rpx;
			color: #666;
			border-bottom: 1rpx solid #eee;

			&:last-child {
				border-bottom: none;
			}

			.td {
				// flex: 1;
				text-align: center;
				padding: 20rpx 0;
				border-right: 1rpx solid #eee;

				&:last-child {
					border-right: none;
				}

				/* 防止长文本溢出 */
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
		}

		.no-data {
			text-align: center;
			padding: 30rpx;
			color: #999;
			font-size: 24rpx;
		}
	}

	.member-list-container {
		width: 100%;
		padding: 10rpx 0;
	}

	/* 单个成员卡片 */
	.member-item {
		display: flex;
		flex-direction: column;
		/* 默认垂直排列，适配手机 */
		background-color: #ffffff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 24rpx;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
		border: 1rpx solid #f0f0f0;
		position: relative;
		transition: all 0.3s ease;

		&:hover {
			box-shadow: 0 6rpx 24rpx rgba(230, 36, 2, 0.1);
			/* 悬停时轻微红晕 */
			transform: translateY(-2rpx);
		}
	}

	/* 成员头部：序号与删除按钮同行 */
	.member-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24rpx;
		padding-bottom: 20rpx;
		border-bottom: 1rpx dashed #eeeeee;
	}

	/* 成员序号 */
	.member-index {
		font-size: 28rpx;
		color: #E62402;
		font-weight: bold;
		display: flex;
		align-items: center;

		&::before {
			content: '';
			display: inline-block;
			width: 6rpx;
			height: 28rpx;
			background-color: #E62402;
			margin-right: 12rpx;
			border-radius: 3rpx;
		}
	}

	/* 删除按钮 */
	.delete-btn {
		color: #ff4d4f;
		font-size: 24rpx;
		padding: 8rpx 16rpx;
		background-color: #fff1f0;
		border-radius: 8rpx;
		display: flex;
		align-items: center;
		cursor: pointer;
		transition: all 0.2s;

		&:active {
			opacity: 0.7;
			transform: scale(0.95);
		}

		text {
			font-weight: 500;
		}

		.iconfont {
			font-weight: bold;
			margin-right: 6rpx;
			font-size: 28rpx;
		}
	}

	/* 输入框包裹层 - 垂直堆叠 */
	.member-inputs {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		/* 每个输入组之间的间距 */
		width: 100%;
	}

	/* 单个输入组 (Label + Input) */
	.input-group {
		gap: 10rpx;
	}

	/* 输入框标签 */
	.input-label {
		width: 100rpx;
		text-align: right;
		font-size: 24rpx;
		color: #666666;
		font-weight: 500;
		margin-left: 4rpx;
	}

	/* 具体输入框样式 */
	.member-input {
		width: 100%;
		height: 70rpx;
		background-color: #f9f9f9;
		border: 1rpx solid #e8e8e8;
		border-radius: 12rpx;
		padding: 0 24rpx;
		font-size: 28rpx;
		color: #333333;
		box-sizing: border-box;
		transition: all 0.2s;

		&:focus {
			background-color: #ffffff;
			border-color: #E62402;
			box-shadow: 0 0 0 4rpx rgba(230, 36, 2, 0.1);
		}

		&::placeholder {
			color: #cccccc;
		}
	}

	/* 添加成员大按钮 */
	.add-member-btn {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 88rpx;
		background-color: #ffffff;
		border: 2rpx dashed #E62402;
		border-radius: 16rpx;
		color: #E62402;
		font-size: 28rpx;
		font-weight: 600;
		margin-top: 10rpx;
		cursor: pointer;
		transition: all 0.2s;
		box-sizing: border-box;

		&:active {
			background-color: #fff1f0;
			transform: scale(0.98);
		}

		.plus-icon {
			font-size: 36rpx;
			margin-right: 10rpx;
			font-weight: bold;
			line-height: 1;
		}
	}

	/* 自定义全屏加载遮罩 */
	.custom-loading {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 99999 !important;
	}

	.loading-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 200rpx;
		height: 200rpx;
		background: #fff;
		border-radius: 16rpx;
	}

	.loading-spinner {
		width: 50rpx;
		height: 50rpx;
		border: 4rpx solid #f3f3f3;
		border-top: 4rpx solid #e62402;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 20rpx;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}

		100% {
			transform: rotate(360deg);
		}
	}

	.jianju_pc {
		gap: 1.5vw;
		display: flex;
		flex-direction: column;
	}

	.jianju_phone {
		gap: 24rpx;
		display: flex;
		flex-direction: column;
	}

	.registration-detail-cell {
		font-size: 22rpx;
		color: #333333;
		line-height: 1.5;
	}

	.registration-count {
		font-weight: 600;
		color: #00aa00;
		margin-bottom: 6rpx;
	}

	.registration-student {
		padding: 6rpx 0;
		border-bottom: 1rpx solid #eeeeee;
	}

	.registration-student-main {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		color: #1F1F1F;
	}

	.registration-success-tag {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2rpx 10rpx;
		margin-right: 8rpx;
		border-radius: 999rpx;
		background: #e8f8ed;
		color: #00aa00;
		font-size: 20rpx;
	}

	.registration-pending-tag {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2rpx 10rpx;
		margin-right: 8rpx;
		border-radius: 999rpx;
		background: #fff7e6;
		color: #fa8c16;
		font-size: 20rpx;
	}

	.registration-fail-tag {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2rpx 10rpx;
		margin-right: 8rpx;
		border-radius: 999rpx;
		background: #fff1f0;
		color: #ff4d4f;
		font-size: 20rpx;
	}

	.registration-student-name {
		font-weight: 600;
	}

	.registration-student-sub,
	.registration-more,
	.registration-empty {
		color: #666666;
		font-size: 20rpx;
		margin-top: 2rpx;
	}

	.registration-more {
		color: #E62402;
	}

	.reg-detail-row {
		padding: 8px 0;
		border-bottom: 1px solid #f5f5f5;
		font-size: 14px;
		line-height: 1.6;
		display: flex;
		align-items: flex-start;
	}

	.reg-detail-label {
		color: #666;
		min-width: 80px;
		flex-shrink: 0;
	}
</style>
