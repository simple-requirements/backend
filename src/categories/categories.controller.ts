import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { CategoryResponseDto } from '@/categories/dto/category-response.dto';
import type { CreateCategoryDto } from '@/categories/dto/create-category.dto';
import { CategoriesService } from '@/categories/categories.service';

@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Post()
    async create(@Body() createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
        return this.categoriesService.create(createCategoryDto);
    }

    @Get()
    async findAll(): Promise<CategoryResponseDto[]> {
        return this.categoriesService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
        return this.categoriesService.findOne(id);
    }
}
