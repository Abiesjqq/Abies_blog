## 函数

### Friend

1. 友元函数：让外部函数能访问类的私有成员。
   - 使用方式：声明 `friend type func(param);`
   - 常见用法：`operator<<`
2. 友元类：使整个类都能访问私有成员。
   - 使用方式：声明 `friend class B;`
3. 友元成员函数：只允许某个类中的某个成员函数访问私有成员。
   - 使用方式：声明 `friend type class::func(param);`

特点：

- friend 不是成员函数
- friend 不受 public/private 位置影响，任何位置都能声明，因为不是成员
- friend 是单向的
- friend 不会继承，A 的友元不是 A 子类的友元

### 初始化

初始化列表的使用方法：`Point::Point(double xa = 0.0, double ya = 0.0) : x(xa), y(ya) {}`

当 private 成员为 const 时，不能赋值，只能初始化。

初始化列表在 ctor 执行之前。但如果在 ctor 中 assign，会先构造对象再赋值，无法完成私有常量的赋值。

默认参数只出现在函数原型，实现是不能加。调用时默认参数必须都放在最后。

### Inline

在调用点直接展开函数，不编译、没有栈操作，但会检查类型（C 中的宏不检查）。

使用方式：

- 原型声明和定义中，都必须加 `inline`
- inline 函数都放在头文件中，因为函数体只相当于声明

```cpp
inline int plusOne(int x);

inline int plusOne(int x) {
	return ++x;
}
```

规则：

- 编译器可能自动决定是否 inline
- 如果成员函数的定义写在声明内，则自动 inline

## 变量

### Const

- 对常量（如 int），可能不分配内存；但对聚合类型（如 struct），一定分配内存。
- Const 不能用于编译期

const 与指针：`*` 和数据类型分开；const 永远修饰左边的东西；左边没有才修饰右边。

```cpp
char* const p;  // p is const pointer
const char* q;  // (*q) is const char
char const* p;  // equals to the above line
const char* const s;  // s and (*s) are both const
```

对成员函数：表示不修改成员变量。

使用方法：声明和定义时，都加 const

```cpp
int get_day() const;

int get_day() const {
	return day;
}
```

### Extern

const 默认为内部链接，只在当前文件可见。`extern` 使其能用于其他文件。

使用方式：

- 其他文件中声明时，不能赋值，如 `extern const int MAX`
- 定义文件中，可以初始化，如 `extern const int MAX = 100`

### Static

所有 static 变量都存在静态区，和全局变量一起。

不同位置的规则：

- 文件作用域中变量：一定为内部链接，不能其他文件中 extern
- 类中成员变量：所有对象共享。E.g.，自动统计对象数量：

```cpp
class Student {
public:
    static int count;

    Student() {
        count++;
    }
};

int Student::count = 0;
```

- 类中成员函数：不默认包含 this 指针，只能访问 static 成员、全局变量和参数。

### Constexpr

使变量能作为编译常量使用。

使用方法：`constexpr int SIZE = 100;`

### Namespace

命名空间用于避免名字冲突。

使用方法：

```cpp
namespace MyLibrary {
	void print() { cout << "hello\n"; }
}

namespace MyLib = MyLibrary;  // namespace aliases

Mylib::print();
```

`using` 可指定 namespace 或某个函数。Namespace 可嵌套。

匿名 namespace 仅在当前文件可见。

## 对象

### Copy Ctor

拷贝构造函数形式：`T::T(const T&)`

当成员中有指针时，必须写 copy ctor，否则拷贝后指向同一地址。

## Inheritance

使用方法：

- 一般使用 public inheritance
- 子类不用重新定义父类函数，直接实现

```cpp
class Base {};
class Derived : public Base {};
```

### Upcasting

对象的指针和引用可以自动转成父类对象，但对象本身不能。

Object slicing：upcasting 时，如果不使用引用或指针，会丧失子类多余的成员

### Virtual

Virtual 说明函数为动态绑定，子类可能重写父类函数，且父类指针调用子类函数。

使用方法：父类中加 virtual，子类中加 override。

```cpp
class Animal {
public:
	virtual void speak() { cout << "Speak\n"; }
}

class Cat : public Animal {
public:
	void speak override { cout << "Meow\n"; }
}
```

纯虚函数为父类只定义接口，使用方法：

```cpp
class Base {
public:
	virtual void func() const = 0;
}
```

Override 规则：

- 继承前后为同名函数，子类的覆盖父类的
- 自动检查是否真的重写虚函数，没有则报错

Virtual 规则：

- 父类中 private 成员也在子类中，但子类无法直接访问
- 子类中没有父类中同名函数的重载版本；想保留重载，需要 `using Base::func;`
- 有纯虚函数，则为抽象类，不能直接创建对象，只能被继承

Virtual 与构造：

- 如果会通过父类指针删除子类对象，则父类 dtor 必须写成 virtual。否则子类析构没执行，导致资源泄露。
- 构造顺序：父类 --> 子类
- 析构顺序：子类 --> 父类

定义的类型为 static type，指向的类型为 dynamic type。E.g.，父类指针指向子类引用。

怎么实现虚函数？在开头增加指针 VPTR（Virtual Table Pointer），指向虚函数表（vtable），其中存函数地址。对象直接赋值（不用指针）时，VPTR 不复制，虚函数不变。

### Multiple Inheritance

菱形继承问题：最开始的基类有多份。

解决方法：

- 虚继承，将父类都放到另外的空间，子类用指针指向

```cpp
class Derived : virtual public Base {};
```

- 最开始的基类写成协议类，只有纯虚函数或 static、没有成员变量
