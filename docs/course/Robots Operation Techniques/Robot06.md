## 速度传递

核心思想：知道前一个坐标系的运动，就可以递推出后一个坐标系的运动。

!!! remarks "旋转坐标系中的求导公式"

    设 $\mathbf{x} = {}^{A}_{B}R \,{}^{B}\mathbf{x}$，则惯性系导数 = 相对导数 + 坐标系旋转产生的变化。

    $$
    \frac{d\mathbf{x}}{dt} = {}^{A}_{B}R \, {}^{B}\dot{\mathbf{x}} + {}^{A}\Omega_B \times {}^{A}_{B}R \,{}^{B}\mathbf{x}
    $$

### 线速度传递

设坐标系 $\{B\}$ 相对于 $\{A\}$ 运动，点 $Q$ 位于 $\{B\}$ 中。则用 $Q$ 在 $\{B\}$ 中的运动状态推导在 $\{A\}$ 中的线速度，分为几部分：

- 坐标系整体平移
- 点的相对运动速度：表示 $\{B\}$ 中线速度转换为 $\{A\}$ 中线速度。
- 旋转产生的速度：旋转角速度乘 ${}^A\mathbf{Q}$，表示坐标系本身旋转带来的切向速度。

总线速度传递公式为：

$$
{}^{A}\mathbf{V}_Q = {}^{A}\mathbf{V}_{BORG} + {}^{A}_{B}\mathbf{R} \, {}^{B}\mathbf{V}_Q + {}^{A}\boldsymbol{\Omega}_B \times {}^{A}_{B}\mathbf{R} \, {}^{B}\mathbf{Q}
$$

### 角速度传递

用 $C$ 在 $\{B\}$ 中的运动状态推导在 $\{A\}$ 中的角速度，分为几部分：

- 坐标系本身的角速度
- 点的相对运动速度：表示点相对于 $\{B\}$ 的速度，转换到 $\{A\}$ 中。

总角速度传递公式为：

$$
{}^{A}\boldsymbol{\Omega}_C = {}^{A}\boldsymbol{\Omega}_B + {}^{A}_{B}\mathbf{R} \, {}^{B}\boldsymbol{\Omega}_C
$$

### 线加速度传递

对线速度公式继续求导，分为以下几项：

- 平移加速度：即坐标系本身的加速度。
- 相对加速度：点在坐标系内部自己的加速度。
- 科里奥利加速度：坐标系在转、且点也在坐标系中运动时产生。
- 切向加速度：来自角加速度。
- 向心加速度：来自本身角速度。

最终得到：

$$
\begin{align*}
{}^{A}\dot{\mathbf{V}}_Q &=
{}^{A}\dot{\mathbf{V}}_{BORG} \\
&+ {}^{A}_{B}R \,{}^{B}\dot{\mathbf{V}}_Q \\
&+ 2 {}^{A}\Omega_B \times {}^{A}_{B}R \,{}^{B}\mathbf{V}_Q  \\
&+ {}^{A}\dot{\Omega}_B \times {}^{A}_{B}R \,{}^{B}\mathbf{Q} \\
&+ {}^{A}\Omega_B \times \left( {}^{A}\Omega_B \times {}^{A}_{B}R \,{}^{B}\mathbf{Q} \right)
\end{align*}
$$

常见情况为质心固定在连杆上，因此 ${}^{B}V_Q={}^{B}\dot{V}_Q = 0$，只剩下平移加速度、切向加速度和向心加速度，公式变为：

$$
{}^{A}\dot{V}_Q = {}^{A}\dot{V}_{BORG} + {}^{A}\dot{\Omega}_B\times r + {}^{A}\Omega_B \times ({}^{A}\Omega_B\times r)
$$

### 角加速度传递

对角速度公式继续求导，得到：

$$
{}^{A}\dot{\boldsymbol{\Omega}}_C = {}^{A}\dot{\boldsymbol{\Omega}}_B + {}^{A}_{B}\mathbf{R} \,{}^{B}\dot{\boldsymbol{\Omega}}_C + {}^{A}\boldsymbol{\Omega}_B \times {}^{A}_{B}\mathbf{R} \,{}^{B}\boldsymbol{\Omega}_C
$$

## 刚体惯性张量与欧拉方程

目标：得到旋转运动中的牛顿第二定律。采用的方法是，先求角动量，再求导得到力矩。

!!! remarks "质点系角动量"

    设刚体由很多质点组成，第 $i$ 个质点 $m_i$ 的位置为 $\mathbf{P}_i$、速度为 $\mathbf{V}_i$，则整体角动量定义为

    $$
    \mathbf{L} = \sum_i \mathbf{P}_i \times m_i\mathbf{V}_i
    $$

    统一将联体坐标系原点放在质心。（为什么？因为 $\sum_i m_iP_i=0$，简化运算。）

!!! remarks "叉积矩阵"

    对 $\mathbf{P} = \begin{bmatrix} x\, y\, z \end{bmatrix}^T$，定义叉积矩阵（反对称矩阵）为

    $$
    \mathbf{P}^{\wedge} = \begin{bmatrix} 0&-z&y\\ z&0&-x\\ -y&x&0 \end{bmatrix}
    $$

    叉积矩阵用于将叉乘转化为矩阵点乘，即

    $$
    \mathbf{P}\times\mathbf{v} = \mathbf{P}^{\wedge}\mathbf{v}
    $$

定义惯性张量为：

$$
\mathbf{I} = \sum_i (-m_i) (\mathbf{P}_i^{\wedge})^2
$$

惯性张量是3x3矩阵，因为绕x、y、z三个方向旋转的转动惯量不同，需要用矩阵记录。具体形式为：

$$
\mathbf{I} =
\begin{bmatrix}
I_{xx}&-I_{xy}&-I_{xz}\\
-I_{xy}&I_{yy}&-I_{yz}\\
-I_{xz}&-I_{yz}&I_{zz}
\end{bmatrix}
$$

其中：

- 对角元素：惯性矩
- 非对角元素：惯性积，表示绕不同轴的耦合程度。很多时候等于零。

整体力矩表示如下，即**欧拉方程**：

$$
\mathbf{N} = \mathbf{I}\dot{\boldsymbol{\omega}} + \boldsymbol{\omega} \times (\mathbf{I}\boldsymbol{\omega})
$$

- 第一项：类似牛顿公式中的 $m\mathbf{a}$
- 第二项：表示进动，即旋转过程中角动量方向的变化。

## 牛顿-欧拉迭代动力学方程

核心目标：根据经典力学，已知关节位置、速度、加速度，求产生这种运动所需的关节力矩。多用于实时控制。

**Newton-Euler Method**用牛顿方程负责求惯性力、欧拉方程负责求惯性力矩。分为两步：

1. 向外迭代：从基座往末端推，得到每个连杆的惯性力和惯性力矩。
2. 向内迭代：从末端往基座推，利用静力平衡，每个关节需要提供的力和力矩。

变量产生流程：

1. 输入：$(\theta,\dot{\theta},\ddot{\theta})$
2. 向外迭代：$\omega_i,\ \dot{\omega}_i,\ a_i,\ a_{Ci}\ \rightarrow\ F_i,\ N_i$
3. 向内迭代：$F_i,\ N_i\ \rightarrow\ f_i,\ n_i$
4. 输出：$\tau_i$

整体流程为：

**1. 计算速度与加速度**

!!! remarks "转动关节的角速度递推"

    $$
    ^{i+1}\omega_{i+1} = {}^{i}_{i+1}R \, {}^{i}\omega_i + \dot{\theta}_{i+1} \hat Z_{i+1}
    $$

    - 第一项：父连杆带来的角速度
    - 第二项：自身关节转动

!!! remarks "转动关节的角加速度递推"

    对上式求导得到：

    $$
    \dot{\omega}_{i+1} = R\dot{\omega}_i + \ddot{\theta}_{i+1}z + R\omega_i \times (\dot{\theta}_{i+1}z)
    $$

!!! remarks "转动关节的线加速度递推"

    $$
    a_{i+1} = Ra_i + \dot{\omega}_i\times O_{i+1} + \omega_i\times (\omega_i\times O_{i+1})
    $$

    - 第一项：平移加速度
    - 第二项：切向加速度
    - 第三项：向心加速度

前面求得的是连杆坐标系原点加速度，需要再做一次递推，得到质心加速度：

$$
a_{Ci} = a_i + \dot{\omega}_i\times P_{Ci} + \omega_i\times(\omega_i\times P_{Ci})
$$

**2. 求惯性力和惯性力矩**

即向外迭代过程。利用牛顿欧拉方程，得到每个连杆的力和力矩：

$$
F_i = m_i a_{Ci}
$$

$$
N_i = I_i\dot{\omega}_i + \omega_i\times(I_i\omega_i)
$$

**3. 力与力矩递推**

即向内迭代过程。（为什么反方向递推？因为必须先知道末端负载，才能知道前面关节需要多大力矩。）

力递推公式：

$$
f_i = R f_{i+1} + F_i
$$

力矩递推公式：

$$
n_i = N_i + Rn_{i+1} + P_{Ci}\times F_i + O_{i+1}\times(Rf_{i+1})
$$

- 第一项：连杆自身惯性力矩。
- 第二项：后面连杆传回来的力矩。
- 第三项：惯性力在质心产生的力矩。
- 第四项：后面连杆的力经过力臂产生的力矩。

**4. 得到关节力矩**

对于转动关节，只有关节轴方向的力矩有效，需要投影到z轴方向：

$$
\tau_i = n_i\cdot z_i
$$

对于移动关节，取力：

$$
\tau_i = f_i^T z_i
$$

## 拉格朗日动力学方法

核心思想：考虑系统总动能 $K$ 和系统总势能 $U$，直接得到动力学方程。多用于理论分析。

定义**拉格朗日函数**（Lagrangian）为：

$$
L = K-U
$$

记 $q = [q_1,q_2,\cdots,q_n]^T$ 表示关节变量，则系统满足：

$$
\frac{d}{dt} \left( \frac{\partial L}{\partial \dot q_i} \right) - \frac{\partial L}{\partial q_i} = \tau_i
$$

### 动能计算

单个连杆 $i$ 的动能：

$$
K_i = \frac12 m_i v_{Ci}^Tv_{Ci} + \frac12 \omega_i^T I_i \omega_i
$$

- 第一项：质心平动动能。
- 第二项：绕质心的刚体旋转动能。

利用之前的雅可比矩阵：

$$
v_{Ci} = J_{Pi}\dot q, \quad \omega_i = J_{Oi}\dot q
$$

代入单个连杆动能，并将所有连杆动能相加，发现所有项都有 $\dot q^T(\cdots)\dot q$ 项，于是统一写成：

$$
K = \frac12 \dot q^T M(q) \dot q
$$

其中，$M(q)$ 即**惯性矩阵**，表示多自由度系统的“质量”，形式为：

$$
M(q) = \sum_{i=1}^{n} \left( m_iJ_{Pi}^TJ_{Pi} + J_{Oi}^TR_iI_iR_i^TJ_{Oi} \right)
$$

### 势能计算

定义重力向量 $g=[0,-g,0]^T$，则总势能如下，本质上为 $mgh$ 的向量形式：

$$
U = -\sum_{i=1}^{n} m_i g^T P_{Ci}
$$

### 拉格朗日方程

将动能和势能代入拉格朗日方程求导，经整理，定义如下量用于简化表达式：

- **第一类Christoffel符号**：

$$
c_{kji} = \frac12 \left( \frac{\partial m_{ij}}{\partial q_k} + \frac{\partial m_{ik}}{\partial q_j} - \frac{\partial m_{jk}}{\partial q_i} \right)
$$

- **科氏力矩矩阵** $C(q,\dot q)$：

$$
c_{ij} = \sum_k c_{kji}\dot q_k
$$

于是所有速度相关项统一写成：

$$
C(q,\dot q)\dot q
$$

定义重力项如下，表示重力产生的恢复力矩：

$$
G(q) =\frac{\partial U}{\partial q}
$$

机器人动力学标准形式为：

$$
M(q)\ddot q + C(q,\dot q)\dot q + B\dot q + G(q) = \tau
$$

- 第一项：惯性项
- 第二项：离心力与科里奥利力
- 第三项：摩擦力
- 第四项：重力
- RHS：驱动力矩
