## 特权级

特权级指CPU当前运行代码的权限等级，用2-bit编码。实验中仅实现M mode。

| Level | 编码 | 名称     | 含义                   |
| ----- | ---- | -------- | ---------------------- |
| 0     | 00   | U mode   | 用户态                 |
| 1     | 01   | S mode   | 内核态/操作系统态      |
| 2     | 10   | Reserved | 保留，和Hypervisor相关 |
| 3     | 11   | M mode   | 机器态，最高权限       |

## CSR

### CSR寄存器

CSR（Control and Status Registers）是一组用于保存CPU控制信息和状态信息的特殊寄存器，M mode中主要包含5个：

- **mstatus**：保存当前机器状态，尤其是中断使能和特权级相关信息。包含：
  - **MIE**（Machine Interrupt Enable）：是否允许M mode中断
  - **MPIE**：进入trap前的MIE值
  - **MPP**：进入trap前的特权级
- **mtvec**：保存异常/中断处理程序的入口地址。
- **mepc**：保存trap前的PC，即恢复时的入口地址。对于异常，mepc为导致异常的指令的PC；对于中断，mepc为处理程序后该继续执行的位置。
- **mcause**：记录trap原因，包括非法指令、访存地址错误、环境调用、外部中断等。
- **mtval**：记录附加的错误信息。本实验中，对于访问错误异常，记录出错的内存地址（虚拟地址）；对于非法指令异常，记录出错的指令编码。

### CSR指令

CSR指令不属于基础整数指令集RV32I，而属于扩展Zicsr extension。其中，指令的11~0位用于指定要访问的CSR寄存器。实验中实现的功能分为三种：

- **读后写**（write）：`csrrw rd, csr_name, rs1`，表示将CSR的旧值读到rd，将rs1的新值写入CSR
- **读后置位**（set）：`csrrs rd, csr_name, rs1`，表示将CSR的旧值读到rd，用rs1中为1的位，把CSR对应位设置为1。
- **读后清零**（clear）：`csrrc rd, csr_name, rs1`，表示将CSR的旧值读到rd，用rs1中为1的位，把CSR对应位设置为0。

对于`csrrwi`、`csrrsi`和`csrrci`，将rs1换成立即数。只读或只写时，用x0代替不需要的部分。

CSR指令是原子操作，即读写不能被其他操作打断。

## 异常与中断

**异常**（exception）指当前正在执行的指令引发的同步事件。如访问错误、环境调用、非法指令。分为两类：

- 精确异常（precise exception）：异常指令之前的所有指令都已经完成；之后的所有指令都不产生影响；能准确指出是哪条指令发生异常。
- 非精确异常（imprecise exception）：不满足精确异常。

**中断**（interrupt）指由外部事件引发的异步事件。

Trap指因exception或interrupt而跳到处理程序的控制转移过程。异常和中断都会进入trap。

Trap发生时的处理：

1. mepc保存异常指令的PC
2. 设置下一条PC为mtvec
3. mcause记录trap的原因
4. 必要时，mtval保存附加信息
5. 修改mstatus：MPIE=MIE, MIE=0, MPP=trap前的特权级
6. CPU进入M mode

处理程序结束后，通常执行`mret`恢复原来的执行流。
