!!! remarks ""

	```cpp
	vector<Student&> v;
	while() {
		Student s;
		cin >> s;
		v.push_back(s);
	}
	```

	由于v中是引用，最终每个元素都相同。

!!! remarks ""

	```cpp
	if (map["test"] == 1) {}
	if (map.count("test") == 1) {}
	```

	map中，第一种方式会隐式插入查询的元素，第二种不会。

!!! remarks ""

	`::operator new(size_t n)` 指分配大小为 n 的内存，但不写入任何内容，返回类型为 `void*`。

	用 new 执行 `MyClass* p = new MyClass` 时，分成两步：

	1. 用 `::operator new` 分配内存
	2. 在分配的内存上调用 ctor

	---

	`::operator delete(OBJECT)` 指直接释放 OBJECT 的内存，不清理其中的资源，返回类型为 `void`。

	用 delete 执行 `delete p` 时，分为两步：

	3. 调用 `*p` 的 dtor
	4. 用 `::operator delete` 释放内存

!!! remarks ""

	`static_cast<目标类型>(表达式)` 常用于强制命名转换。

	当需要去除 const 时，需要使用 `const_cast`。

!!! remarks ""

	`void*` 不支持指针的数值运算，可以化为 `char*`，因为 char 占一个字节便于按字节偏移。

!!! remarks ""

	定义模板类的函数时，要在类名后加上数据类型。E.g.

	```cpp
	template <typename T>
	void ClassName<T>::func(param) {}
	```

!!! remarks ""

	cerr 和 cout 的区别：

	- cout 有缓冲，cerr 无缓冲
	- cout 可以重定向，cerr 只能输出到终端


